import Button from "@components/Button";
import { Modal, ModalTrigger } from "@components/modal/Modal";
import { DownloadIcon } from "lucide-react";
import React, { useState } from "react";
import SetupModal from "@/modules/setup-wardenclyffe-modal/SetupModal";

export function InstallWardenClyffeButton() {
  const [installModal, setInstallModal] = useState(false);

  return (
    <Modal open={installModal} onOpenChange={setInstallModal}>
      <ModalTrigger asChild>
        <Button variant={"secondary"} size={"sm"}>
          <DownloadIcon size={16} />
          Install WardenClyffe
        </Button>
      </ModalTrigger>
      <SetupModal />
    </Modal>
  );
}
