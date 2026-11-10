//go:build !js

package internal

import (
	"github.com/shippin/wardenclyffe/client/internal/auth/sessionwatch"
	"github.com/shippin/wardenclyffe/client/internal/peer"
)

// newSessionWatcher returns the real SSO session expiry watcher for every
// non-wasm build. The js/wasm build gets a no-op stub from
// engine_sessionwatch_js.go so the sessionwatch package (and its timer
// machinery) never links into the wasm binary.
func newSessionWatcher(recorder *peer.Status) sessionDeadlineWatcher {
	return sessionwatch.New(recorder)
}
