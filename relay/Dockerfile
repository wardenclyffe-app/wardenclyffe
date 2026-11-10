FROM gcr.io/distroless/base:debug
ENTRYPOINT [ "/go/bin/wardenclyffe-relay" ]
ENV NB_LOG_FILE=console
ARG TARGETPLATFORM
COPY ${TARGETPLATFORM}/wardenclyffe-relay /go/bin/wardenclyffe-relay
