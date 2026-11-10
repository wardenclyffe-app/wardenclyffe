package types

import (
	"context"
	"testing"

	"github.com/shippin/wardenclyffe/dns"
	"github.com/shippin/wardenclyffe/shared/management/networkmap/nmdata"
	"github.com/shippin/wardenclyffe/shared/management/types"
	"github.com/stretchr/testify/assert"
)

func TestGetPeerNetworkMapComponents_PeerMissingFromAcount(t *testing.T) {
	account := Account{Network: NewNetwork()}
	nmapcomponets := account.GetPeerNetworkMapComponents(context.TODO(), "missing-peer", dns.CustomZone{}, nil, nil, nil, nil, nil)

	assert.Equal(t, EmptyNetworkMapComponents(&types.NetworkMapComponents{
		PeerID:                        "missing-peer",
		Network:                       TwinNetwork(account.Network),
		Peers:                         map[string]*nmdata.Peer{"missing-peer": nil},
		ForceRoutingPeerDNSResolution: false,
	}), nmapcomponets)
}
