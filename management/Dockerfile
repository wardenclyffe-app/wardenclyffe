FROM ubuntu:24.04
RUN apt update && apt install -y ca-certificates && rm -fr /var/cache/apt
ENTRYPOINT [ "/go/bin/wardenclyffe-mgmt","management"]
CMD ["--log-file", "console"]
ARG TARGETPLATFORM
COPY ${TARGETPLATFORM}/wardenclyffe-mgmt /go/bin/wardenclyffe-mgmt
