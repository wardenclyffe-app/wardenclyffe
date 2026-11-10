//go:build e2e

package selfhost

import (
	"context"
	"encoding/json"
	"net/netip"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	clientstatus "github.com/shippin/wardenclyffe/client/status"
	"github.com/shippin/wardenclyffe/e2e/harness"
	"github.com/shippin/wardenclyffe/shared/management/http/api"
)

func TestSelfHostedPeerConnectivityAndPersistence(t *testing.T) {
	for _, mode := range []struct {
		name       string
		connection string
		env        map[string]string
	}{
		{name: "direct", connection: "P2P"},
		{name: "relay", connection: "Relayed", env: map[string]string{"NB_FORCE_RELAY": "true"}},
	} {
		t.Run(mode.name, func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
			t.Cleanup(cancel)
			server, err := harness.StartCombined(ctx)
			require.NoError(t, err)
			t.Cleanup(func() { require.NoError(t, server.Terminate(context.Background())) })
			_, err = server.Bootstrap(ctx)
			require.NoError(t, err)
			_, err = server.Bootstrap(ctx)
			require.Error(t, err, "initial setup must not be repeatable")

			group, err := server.API().Groups.Create(ctx,
				api.PostApiGroupsJSONRequestBody{Name: "acceptance-peers"})
			require.NoError(t, err, "new owner must authenticate and create groups")
			policies, err := server.API().Policies.List(ctx)
			require.NoError(t, err)
			for _, policy := range policies {
				require.NotNil(t, policy.Id)
				require.NoError(t, server.API().Policies.Delete(ctx, *policy.Id))
			}
			groups := []string{group.Id}
			policyRequest := api.PolicyUpdate{
				Name: "acceptance-policy", Enabled: true,
				Rules: []api.PolicyRuleUpdate{{
					Name: "acceptance-rule", Enabled: true, Bidirectional: true,
					Action: "accept", Protocol: "all", Sources: &groups, Destinations: &groups,
				}},
			}
			policy, err := server.API().Policies.Create(ctx, policyRequest)
			require.NoError(t, err)
			require.NotNil(t, policy.Id)
			key, err := server.API().SetupKeys.Create(ctx, api.PostApiSetupKeysJSONRequestBody{
				Name: "acceptance-key", Type: "reusable", ExpiresIn: 86400,
				AutoGroups: groups, UsageLimit: 2,
			})
			require.NoError(t, err)
			left, err := harness.StartClient(ctx, server, key.Key,
				harness.WithClientName("acceptance-left"), harness.WithClientEnv(mode.env))
			require.NoError(t, err)
			t.Cleanup(func() { require.NoError(t, left.Terminate(context.Background())) })
			right, err := harness.StartClient(ctx, server, key.Key,
				harness.WithClientName("acceptance-right"), harness.WithClientEnv(mode.env))
			require.NoError(t, err)
			t.Cleanup(func() { require.NoError(t, right.Terminate(context.Background())) })
			require.NoError(t, left.WaitConnected(ctx, time.Minute))
			require.NoError(t, right.WaitConnected(ctx, time.Minute))

			peers, err := server.API().Peers.List(ctx)
			require.NoError(t, err)
			require.Len(t, peers, 2, "both real clients must register in this isolated instance")
			var rightAddress netip.Addr
			for _, peer := range peers {
				if peer.Name == right.Hostname() {
					rightAddress, err = netip.ParseAddr(peer.Ip)
					require.NoError(t, err)
					rightAddress = rightAddress.Unmap()
				}
			}
			require.True(t, rightAddress.IsValid(), "right client must have an overlay address")
			require.Eventually(t, func() bool {
				return left.PingPeer(ctx, rightAddress) == nil
			}, time.Minute, 2*time.Second, "permitted packets must arrive over the overlay")
			require.Eventually(t, func() bool {
				output, err := left.Status(ctx, "--json")
				if err != nil {
					return false
				}
				var overview clientstatus.OutputOverview
				if json.Unmarshal([]byte(output), &overview) != nil {
					return false
				}
				for _, peer := range overview.Peers.Details {
					if peer.IP == rightAddress.String() && peer.Status == "Connected" {
						return peer.ConnType == mode.connection
					}
				}
				return false
			}, time.Minute, 2*time.Second, "peer status must confirm the intended transport")

			policyRequest.Enabled = false
			_, err = server.API().Policies.Update(ctx, *policy.Id, api.PolicyCreate(policyRequest))
			require.NoError(t, err)
			require.Eventually(t, func() bool {
				return left.PingPeer(ctx, rightAddress) != nil
			}, time.Minute, 2*time.Second, "disabling the sole policy must block actual traffic")
			for range 3 {
				assert.Error(t, left.PingPeer(ctx, rightAddress), "blocked traffic must stay blocked")
			}
			policyRequest.Enabled = true
			_, err = server.API().Policies.Update(ctx, *policy.Id, api.PolicyCreate(policyRequest))
			require.NoError(t, err)
			require.Eventually(t, func() bool {
				return left.PingPeer(ctx, rightAddress) == nil
			}, time.Minute, 2*time.Second, "restoring policy must restore actual traffic")

			require.NoError(t, server.Restart(ctx))
			require.EventuallyWithT(t, func(collect *assert.CollectT) {
				savedPeers, err := server.API().Peers.List(ctx)
				require.NoError(collect, err)
				assert.Len(collect, savedPeers, 2, "saved peers must survive restart")
			}, time.Minute, time.Second, "restart must preserve peers and authenticated access")
			savedPolicy, err := server.API().Policies.Get(ctx, *policy.Id)
			require.NoError(t, err)
			assert.True(t, savedPolicy.Enabled, "restart must retain the restored policy")
			require.Eventually(t, func() bool {
				return left.PingPeer(ctx, rightAddress) == nil
			}, time.Minute, 2*time.Second, "traffic must work after management restart")
		})
	}
}
