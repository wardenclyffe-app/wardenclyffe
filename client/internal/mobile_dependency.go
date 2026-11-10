package internal

import (
	"net/netip"

	"github.com/shippin/wardenclyffe/client/iface/device"
	"github.com/shippin/wardenclyffe/client/internal/dns"
	"github.com/shippin/wardenclyffe/client/internal/listener"
	"github.com/shippin/wardenclyffe/client/internal/stdnet"
)

// MobileDependency collect all dependencies for mobile platform
type MobileDependency struct {
	// Android and iOS
	NetworkChangeListener listener.NetworkChangeListener

	// Android only
	TunAdapter       device.TunAdapter
	IFaceDiscover    stdnet.ExternalIFaceDiscover
	HostDNSAddresses []netip.AddrPort
	DnsReadyListener dns.ReadyListener

	//	iOS only
	DnsManager     dns.IosDnsManager
	FileDescriptor int32
	StateFilePath  string

	// TempDir is a writable directory for temporary files (e.g., debug bundle zip).
	// On Android, this should be set to the app's cache directory.
	TempDir string
}
