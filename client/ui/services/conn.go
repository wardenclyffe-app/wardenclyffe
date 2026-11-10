//go:build !android && !ios && !freebsd && !js

package services

import "github.com/shippin/wardenclyffe/client/proto"

// DaemonConn returns a lazy gRPC client to the WardenClyffe daemon.
// All services receive a DaemonConn so they share a single connection.
type DaemonConn interface {
	Client() (proto.DaemonServiceClient, error)
}

func ptrStr(s string) *string { return &s }
