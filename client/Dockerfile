# build & run locally with:
#   cd "$(git rev-parse --show-toplevel)"
#   CGO_ENABLED=0 go build -o wardenclyffe ./client
#   sudo podman build -t localhost/wardenclyffe:latest -f client/Dockerfile --ignorefile .dockerignore-client .
#   sudo podman run --rm -it --cap-add={BPF,NET_ADMIN,NET_RAW} localhost/wardenclyffe:latest

FROM alpine:3.24
# iproute2: busybox doesn't display ip rules properly
RUN apk add --no-cache \
    bash \
    ca-certificates \
    ip6tables \
    iproute2 \
    iptables

ENV \
    WARDENCLYFFE_BIN="/usr/local/bin/wardenclyffe" \
    NB_LOG_FILE="console,/var/log/wardenclyffe/client.log" \
    NB_DAEMON_ADDR="unix:///var/run/wardenclyffe.sock" \
    NB_ENABLE_CAPTURE="false" \
    NB_ENTRYPOINT_SERVICE_TIMEOUT="30"

ENTRYPOINT [ "/usr/local/bin/wardenclyffe-entrypoint.sh" ]
ARG TARGETPLATFORM
ARG WARDENCLYFFE_BINARY=$TARGETPLATFORM/wardenclyffe
COPY --chmod=0755 client/wardenclyffe-entrypoint.sh /usr/local/bin/wardenclyffe-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/wardenclyffe-entrypoint.sh
COPY "${WARDENCLYFFE_BINARY}"  /usr/local/bin/wardenclyffe
