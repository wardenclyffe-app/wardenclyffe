package store

import (
	nbdns "github.com/shippin/wardenclyffe/dns"
	"github.com/shippin/wardenclyffe/management/internals/modules/reverseproxy/accesslogs"
	"github.com/shippin/wardenclyffe/management/internals/modules/reverseproxy/domain"
	"github.com/shippin/wardenclyffe/management/internals/modules/reverseproxy/proxy"
	rpservice "github.com/shippin/wardenclyffe/management/internals/modules/reverseproxy/service"
	"github.com/shippin/wardenclyffe/management/internals/modules/zones"
	"github.com/shippin/wardenclyffe/management/internals/modules/zones/records"
	resourceTypes "github.com/shippin/wardenclyffe/management/server/networks/resources/types"
	routerTypes "github.com/shippin/wardenclyffe/management/server/networks/routers/types"
	networkTypes "github.com/shippin/wardenclyffe/management/server/networks/types"
	nbpeer "github.com/shippin/wardenclyffe/management/server/peer"
	"github.com/shippin/wardenclyffe/management/server/posture"
	"github.com/shippin/wardenclyffe/management/server/types"
	"github.com/shippin/wardenclyffe/route"

	agentNetworkTypes "github.com/shippin/wardenclyffe/management/internals/modules/agentnetwork/types"
)

func managedStoreModels() []any {
	return []any{
		&types.SetupKey{}, &nbpeer.Peer{}, &types.User{}, &types.PersonalAccessToken{}, &types.ProxyAccessToken{},
		&types.Group{}, &types.GroupPeer{},
		&types.Account{}, &types.Policy{}, &types.PolicyRule{}, &route.Route{}, &nbdns.NameServerGroup{},
		&installation{}, &types.ExtraSettings{}, &posture.Checks{}, &nbpeer.NetworkAddress{},
		&networkTypes.Network{}, &routerTypes.NetworkRouter{}, &resourceTypes.NetworkResource{}, &types.AccountOnboarding{},
		&types.Job{}, &zones.Zone{}, &records.Record{}, &types.UserInviteRecord{}, &rpservice.Service{}, &rpservice.Target{}, &domain.Domain{},
		&accesslogs.AccessLogEntry{}, &proxy.Proxy{},
		&agentNetworkTypes.Provider{}, &agentNetworkTypes.Policy{}, &agentNetworkTypes.Guardrail{}, &agentNetworkTypes.Settings{},
		&agentNetworkTypes.Consumption{}, &agentNetworkTypes.AccountBudgetRule{},
		&agentNetworkTypes.AgentNetworkAccessLog{}, &agentNetworkTypes.AgentNetworkAccessLogGroup{},
		&agentNetworkTypes.AgentNetworkUsage{}, &agentNetworkTypes.AgentNetworkUsageGroup{},
		&types.UIEvent{},
	}
}
