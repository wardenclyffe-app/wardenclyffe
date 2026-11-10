FROM ubuntu:24.04
RUN apt update && apt install -y ca-certificates && rm -fr /var/cache/apt
ENTRYPOINT [ "/go/bin/wardenclyffe-server" ]
CMD ["--config", "/etc/wardenclyffe/config.yaml"]
ARG TARGETPLATFORM
COPY ${TARGETPLATFORM}/wardenclyffe-server /go/bin/wardenclyffe-server
