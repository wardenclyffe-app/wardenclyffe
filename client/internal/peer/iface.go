package peer

import (
	"net"
	"net/netip"
	"time"

	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"

	"github.com/shippin/wardenclyffe/client/iface/configurer"
	"github.com/shippin/wardenclyffe/client/iface/wgaddr"
	"github.com/shippin/wardenclyffe/client/iface/wgproxy"
)

type WGIface interface {
	UpdatePeer(peerKey string, allowedIps []netip.Prefix, keepAlive time.Duration, endpoint *net.UDPAddr, preSharedKey *wgtypes.Key) error
	RemovePeer(peerKey string) error
	GetStats() (map[string]configurer.WGStats, error)
	GetProxy() wgproxy.Proxy
	Address() wgaddr.Address
	RemoveEndpointAddress(key string) error
}
