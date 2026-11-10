package daemonaddr

import (
	"slices"
	"testing"
)

// The protected name must be tried before the plain one on both sides: it is the
// one an unprivileged process cannot create, so preferring it is what keeps a
// squatter from owning the name the service daemon would otherwise use.
func TestPipePaths_PrefersTheProtectedName(t *testing.T) {
	got := PipePaths("wardenclyffe")
	want := []string{
		`\\.\pipe\ProtectedPrefix\Administrators\wardenclyffe`,
		`\\.\pipe\wardenclyffe`,
	}
	if !slices.Equal(got, want) {
		t.Errorf("PipePaths = %q, want %q", got, want)
	}
}

// An operator who passes a full path chose exactly one pipe, so neither side may
// look anywhere else.
func TestPipePaths_QualifiedPathIsUsedAsIs(t *testing.T) {
	path := `\\.\pipe\custom-wardenclyffe`
	got := PipePaths(path)
	if !slices.Equal(got, []string{path}) {
		t.Errorf("PipePaths = %q, want just %q", got, path)
	}
}
