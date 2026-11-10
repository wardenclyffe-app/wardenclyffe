//go:build !windows

package dns

import (
	"net"

	"golang.zx2c4.com/wireguard/tun/netstack"

	"github.com/shippin/wardenclyffe/client/iface/device"
	"github.com/shippin/wardenclyffe/client/iface/wgaddr"
)

// WGIface defines subset methods of interface required for manager
type WGIface interface {
	Name() string
	Address() wgaddr.Address
	ToInterface() *net.Interface
	IsUserspaceBind() bool
	GetFilter() device.PacketFilter
	GetDevice() *device.FilteredDevice
	GetNet() *netstack.Net
}
