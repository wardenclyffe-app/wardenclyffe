FROM gcr.io/distroless/base:debug
ENTRYPOINT [ "/go/bin/wardenclyffe-signal","run" ]
CMD ["--log-file", "console"]
ARG TARGETPLATFORM
COPY ${TARGETPLATFORM}/wardenclyffe-signal /go/bin/wardenclyffe-signal
