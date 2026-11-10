package version

import (
	"runtime"

	"golang.org/x/sys/windows/registry"
)

const (
	urlWinExe    = "https://pkgs.wardenclyffe.app/windows/x64"
	urlWinExeArm = "https://pkgs.wardenclyffe.app/windows/arm64"
)

var regKeyAppPath = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Wardenclyffe"

// DownloadUrl return with the proper download link
func DownloadUrl() string {
	_, err := registry.OpenKey(registry.LOCAL_MACHINE, regKeyAppPath, registry.QUERY_VALUE)
	if err != nil {
		return downloadURL
	}

	url := urlWinExe
	if runtime.GOARCH == "arm64" {
		url = urlWinExeArm
	}

	return url
}
