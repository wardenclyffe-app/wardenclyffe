import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";

export const MSPTenantDocsLink = () => {
  return (
    <>
      Learn more about
      <InlineLink
        href={"https://docs.wardenclyffe.app/how-to/msp-portal"}
        target={"_blank"}
      >
        MSP Portal
        <ExternalLinkIcon size={12} />
      </InlineLink>
    </>
  );
};
