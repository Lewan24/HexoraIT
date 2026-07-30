import { useEffect, useState } from "react";
import { versionApi } from "../api/resources";

export function useVersionCheck() {
    const [currentVersion, setCurrentVersion] = useState<string>();
    const [latestVersion, setLatestVersion] = useState<string>();
    const [dismissed, setDismissed] = useState(false);

    const updateAvailable =
        !!currentVersion &&
        !!latestVersion &&
        currentVersion !== latestVersion &&
        !dismissed;

    useEffect(() => {
        async function checkVersion() {
            const [currentResponse, latestResponse] = await Promise.all([
                versionApi.getCurrentVersion(),
                versionApi.getLatestVersion()
            ]);

            setCurrentVersion(currentResponse);
            setLatestVersion(latestResponse);
        }

        checkVersion();

    }, []);

    return {
        currentVersion,
        latestVersion,
        updateAvailable,
        closeUpdateDialog: () => setDismissed(true)
    };
}