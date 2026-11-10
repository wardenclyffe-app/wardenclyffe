package common

import (
	"sync/atomic"
	"time"

	"github.com/shippin/wardenclyffe/client/firewall/manager"
	"github.com/shippin/wardenclyffe/client/internal/dns"
	"github.com/shippin/wardenclyffe/client/internal/peer"
	"github.com/shippin/wardenclyffe/client/internal/peerstore"
	"github.com/shippin/wardenclyffe/client/internal/routemanager/fakeip"
	"github.com/shippin/wardenclyffe/client/internal/routemanager/iface"
	"github.com/shippin/wardenclyffe/client/internal/routemanager/refcounter"
	"github.com/shippin/wardenclyffe/route"
)

type HandlerParams struct {
	Route                *route.Route
	RouteRefCounter      *refcounter.RouteRefCounter
	AllowedIPsRefCounter *refcounter.AllowedIPsRefCounter
	DnsRouterInterval    time.Duration
	StatusRecorder       *peer.Status
	WgInterface          iface.WGIface
	DnsServer            dns.Server
	PeerStore            *peerstore.Store
	UseNewDNSRoute       bool
	Firewall             manager.Manager
	FakeIPManager        *fakeip.Manager
	ForwarderPort        *atomic.Uint32
}
