package lazyconn

import (
	"net"
	"net/netip"
	"time"

	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"

	"github.com/shippin/wardenclyffe/client/iface/wgaddr"
	"github.com/shippin/wardenclyffe/monotime"
)

type WGIface interface {
	RemovePeer(peerKey string) error
	UpdatePeer(peerKey string, allowedIps []netip.Prefix, keepAlive time.Duration, endpoint *net.UDPAddr, preSharedKey *wgtypes.Key) error
	IsUserspaceBind() bool
	Address() wgaddr.Address
	LastActivities() map[string]monotime.Time
	MTU() uint16
}
