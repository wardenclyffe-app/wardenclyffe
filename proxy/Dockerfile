FROM golang:1.27.3-alpine AS builder
WORKDIR /app

RUN echo "wardenclyffe:x:1000:1000:wardenclyffe:/var/lib/wardenclyffe:/sbin/nologin" > /tmp/passwd && \
    echo "wardenclyffe:x:1000:wardenclyffe" > /tmp/group && \
    mkdir -p /tmp/var/lib/wardenclyffe && \
    mkdir -p /tmp/certs

FROM gcr.io/distroless/base:debug
ARG TARGETPLATFORM
COPY ${TARGETPLATFORM}/wardenclyffe-proxy /go/bin/wardenclyffe-proxy
COPY --from=builder /tmp/passwd /etc/passwd
COPY --from=builder /tmp/group /etc/group
COPY --from=builder --chown=1000:1000 /tmp/var/lib/wardenclyffe /var/lib/wardenclyffe
COPY --from=builder --chown=1000:1000 --chmod=755 /tmp/certs /certs
USER wardenclyffe:wardenclyffe
ENV HOME=/var/lib/wardenclyffe
ENV NB_PROXY_ADDRESS=":8443"
EXPOSE 8443
ENTRYPOINT ["/go/bin/wardenclyffe-proxy"]
