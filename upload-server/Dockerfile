FROM gcr.io/distroless/base:debug
ENTRYPOINT [ "/go/bin/wardenclyffe-upload" ]
ARG TARGETPLATFORM
COPY ${TARGETPLATFORM}/wardenclyffe-upload /go/bin/wardenclyffe-upload
