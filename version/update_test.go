package version

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	goversion "github.com/hashicorp/go-version"
)

func TestStopWatchCancelsActiveFetch(t *testing.T) {
	oldURL := versionURL
	t.Cleanup(func() { versionURL = oldURL })
	started := make(chan struct{})
	cancelled := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(started)
		<-r.Context().Done()
		close(cancelled)
	}))
	t.Cleanup(server.Close)
	versionURL = server.URL
	u := NewUpdateAndStart(httpAgent)
	t.Cleanup(u.StopWatch)
	select {
	case <-started:
	case <-time.After(3 * time.Second):
		t.Fatal("version request must start")
	}
	stopped := make(chan struct{})
	go func() {
		u.StopWatch()
		u.StopWatch()
		close(stopped)
	}()
	select {
	case <-cancelled:
	case <-time.After(3 * time.Second):
		t.Error("stopping must cancel the active HTTP request")
		server.CloseClientConnections()
	}
	select {
	case <-stopped:
	case <-time.After(3 * time.Second):
		t.Error("idempotent stop must finish")
	}
}

func TestStopWatchBeforeStart(t *testing.T) {
	u := NewUpdate(httpAgent)
	u.StopWatch()
	done := make(chan struct{})
	go func() {
		u.StartFetcher()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("a stopped watcher must not start a fetch loop")
	}
}

func TestVersionFetchRejectsOversizedChunkedResponse(t *testing.T) {
	oldURL := versionURL
	t.Cleanup(func() { versionURL = oldURL })
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Error("test server must support chunked responses")
			return
		}
		flusher.Flush()
		_, err := fmt.Fprint(w, "1.0.0"+string(make([]byte, 101)))
		if err != nil {
			t.Errorf("write test response: %v", err)
		}
	}))
	t.Cleanup(server.Close)
	versionURL = server.URL
	u := NewUpdate(httpAgent)
	t.Cleanup(u.StopWatch)
	if u.fetchVersion() {
		t.Error("oversized chunked response must not publish an update")
	}
	if u.LatestVersion() != nil {
		t.Error("rejected response must not populate the version cache")
	}
}

func TestUpdateListenerCanUnregisterItself(t *testing.T) {
	u := NewUpdate(httpAgent)
	t.Cleanup(u.StopWatch)
	latest, err := goversion.NewVersion("1000.0.0")
	if err != nil {
		t.Fatal(err)
	}
	u.latestAvailable = latest
	done := make(chan struct{})
	go func() {
		u.SetOnUpdateListener(func() {
			u.SetOnUpdateListener(nil)
			u.StopWatch()
		})
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("listener must be able to unregister and stop without deadlocking")
	}
}

const httpAgent = "pkg/test"

func TestNewUpdate(t *testing.T) {
	version = "1.0.0"
	svr := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "10.0.0")
	}))
	defer svr.Close()
	versionURL = svr.URL

	wg := &sync.WaitGroup{}
	wg.Add(1)

	onUpdate := false
	u := NewUpdateAndStart(httpAgent)
	defer u.StopWatch()
	u.SetOnUpdateListener(func() {
		onUpdate = true
		wg.Done()
	})

	waitTimeout(wg)
	if onUpdate != true {
		t.Errorf("update not found")
	}
}

func TestDoNotUpdate(t *testing.T) {
	version = "11.0.0"
	svr := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "10.0.0")
	}))
	defer svr.Close()
	versionURL = svr.URL

	wg := &sync.WaitGroup{}
	wg.Add(1)

	onUpdate := false
	u := NewUpdateAndStart(httpAgent)
	defer u.StopWatch()
	u.SetOnUpdateListener(func() {
		onUpdate = true
		wg.Done()
	})

	waitTimeout(wg)
	if onUpdate == true {
		t.Errorf("invalid update")
	}
}

func TestDaemonUpdate(t *testing.T) {
	version = "11.0.0"
	svr := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "11.0.0")
	}))
	defer svr.Close()
	versionURL = svr.URL

	wg := &sync.WaitGroup{}
	wg.Add(1)

	onUpdate := false
	u := NewUpdateAndStart(httpAgent)
	defer u.StopWatch()
	u.SetOnUpdateListener(func() {
		onUpdate = true
		wg.Done()
	})

	u.SetDaemonVersion("10.0.0")

	waitTimeout(wg)
	if onUpdate != true {
		t.Errorf("invalid daemon version check")
	}
}

func waitTimeout(wg *sync.WaitGroup) {
	c := make(chan struct{})
	go func() {
		wg.Wait()
		close(c)
	}()
	select {
	case <-c:
		return
	case <-time.After(time.Second):
		return
	}
}
