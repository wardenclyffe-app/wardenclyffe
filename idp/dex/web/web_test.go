package web

import (
	"bytes"
	"html/template"
	"io/fs"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLoginHeaderBranding(t *testing.T) {
	header, err := fs.ReadFile(FS(), "templates/header.html")
	require.NoError(t, err)
	tmpl, err := template.New("header").Funcs(template.FuncMap{
		"issuer": func() string { return "WardenClyffe" },
		"url": func(_ string, asset string) string {
			return "../../" + asset
		},
	}).Parse(string(header))
	require.NoError(t, err)

	var rendered bytes.Buffer
	require.NoError(t, tmpl.Execute(&rendered, struct{ ReqPath string }{
		ReqPath: "/oauth2/auth/local",
	}))
	html := rendered.String()
	require.Contains(t, html, `src="../../theme/logo.svg"`, "Login must use the embedded WardenClyffe asset")
	require.Contains(t, html, `alt="WardenClyffe"`, "Login logo must expose the product name")
	require.Contains(t, html, `href="../../theme/favicon.svg"`, "Login must use the new favicon")
	require.NotContains(t, html, "<svg", "Login header must not embed the old outlined wordmark")
	require.NotContains(t, strings.ToLower(html), "#f68330", "Login controls must not use the legacy orange")

	for _, name := range []string{"logo.svg", "favicon.svg"} {
		asset, err := fs.ReadFile(FS(), "themes/light/"+name)
		require.NoError(t, err)
		require.Contains(t, string(asset), "<title>WardenClyffe</title>", "Embedded branding must name WardenClyffe")
	}

}

func TestLoginTemplatesRemoveLegacyOrange(t *testing.T) {
	templates, err := fs.Glob(FS(), "templates/*.html")
	require.NoError(t, err)
	for _, name := range templates {
		content, err := fs.ReadFile(FS(), name)
		require.NoError(t, err)
		require.NotContains(t, strings.ToLower(string(content)), "#f68330",
			"Template %s must not retain legacy orange", name)
	}

}

func TestPublicChatBoundary(t *testing.T) {
	footer, err := fs.ReadFile(FS(), "templates/footer.html")
	require.NoError(t, err)
	tmpl, err := template.New("footer").Funcs(template.FuncMap{
		"url": func(_ string, asset string) string { return "../../" + asset },
	}).Parse(string(footer))
	require.NoError(t, err)
	var rendered bytes.Buffer
	require.NoError(t, tmpl.Execute(&rendered, struct{ ReqPath string }{ReqPath: "/oauth2/auth/local"}))
	require.Contains(t, rendered.String(), `aria-label="Clyffy Chat"`, "Sign-in must include a dedicated chat boundary")
	require.Contains(t, rendered.String(), `src="../../theme/chat/chat.js"`, "Sign-in must load chat controls")
	require.Contains(t, rendered.String(), "Chat is unavailable", "Chat must not claim a connected backend")
	require.Contains(t, rendered.String(), `<button type="button" disabled>Send message</button>`, "Chat must not accept messages without a backend")
	require.NotContains(t, rendered.String(), "guidance", "Chat must not contain scripted guidance")
	_, err = fs.ReadFile(FS(), "themes/light/chat/chat.js")
	require.NoError(t, err)
	_, err = fs.ReadFile(FS(), "themes/light/chat/styles.css")
	require.NoError(t, err)
}
