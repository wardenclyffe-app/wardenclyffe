package types

const (
	// ClientHeader is the header used to identify the client
	ClientHeader = "x-nb-client"
	// ClientHeaderValue is the value of the ClientHeader
	ClientHeaderValue = "wardenclyffe"
	// GetURLPath is the path for the GetURL request
	GetURLPath = "/upload-url"

	DefaultBundleURL = "https://upload.debug.wardenclyffe.app" + GetURLPath
)

// GetURLResponse is the response for the GetURL request
type GetURLResponse struct {
	URL string
	Key string
}
