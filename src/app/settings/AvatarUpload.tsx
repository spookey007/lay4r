"use client";

import { useCallback, useMemo } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";

registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateSize,
  FilePondPluginFileValidateType
);

interface AvatarUploadProps {
  onUpdate: (file: File | null) => void;
  currentAvatarUrl?: string;
}

export default function AvatarUpload({
  onUpdate,
  currentAvatarUrl,
}: AvatarUploadProps) {
  const handleUpdateFiles = useCallback(
    (fileItems: any[]) => {
      if (fileItems.length > 0) {
        const file = fileItems[0].file;
        onUpdate(file);
      } else {
        onUpdate(null);
      }
    },
    [onUpdate]
  );

  // Prepare initial files for FilePond — mark as "already uploaded" to avoid re-upload
  const files = useMemo(() => {
    if (currentAvatarUrl) {
      return [
        {
          source: currentAvatarUrl,
          options: {
            type: "local", // tells FilePond this is a local preview
            metadata: {
              // Mark as server file so FilePond doesn't try to re-upload
              // This prevents "upload" when component mounts
              serverId: "existing-avatar",
            },
          },
        },
      ];
    }
    return [];
  }, [currentAvatarUrl]);

  return (
    <div>
      <FilePond
        files={files}
        allowMultiple={false}
        maxFileSize="3MB"
        acceptedFileTypes={["image/*"]}
        onupdatefiles={handleUpdateFiles}
        labelIdle='Drag & Drop your avatar or <span class="filepond--label-action">Browse</span>'
        // ⚠️ Remove server config — you handle upload in parent component
        allowReorder={false}
        allowRemove={true}
        allowReplace={true}
        instantUpload={false}
        // Optional: style tweaks
        credits={false} // remove "Powered by FilePond" if desired
      />
    </div>
  );
}