package nmaptest_test

import (
	"path/filepath"
	"testing"

	"github.com/shippin/wardenclyffe/management/internals/controllers/network_map/nmaptest"
)

func TestNetworkMapGolden(t *testing.T) {
	nmaptest.RunGoldenDir(t, filepath.Join("testdata", "cases"))
}
