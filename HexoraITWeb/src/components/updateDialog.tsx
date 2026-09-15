import { tr, useLocale } from '../i18n'
interface UpdateDialogProps {
    open: boolean;
    currentVersion?: string;
    latestVersion?: string;

    onClose: () => void 
}

export default function UpdateDialog({open, currentVersion, latestVersion, onClose}: UpdateDialogProps) {
  useLocale()
    if (!open)
        return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        ↑
                    </div>
                    
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                             {tr("New update available!")} </h2>

                        <p className="mt-1 text-sm text-gray-500">
                             {tr("A new HexoraIT update is available.")} </p>
                    </div>
                </div>

                <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">
                             {tr("Current version")} </span>

                        <span className="font-medium text-gray-900">
                            {currentVersion}
                        </span>
                    </div>

                    <div className="my-2 border-t border-gray-200"/>

                    <div className="flex justify-between">
                        <span className="text-gray-500">
                             {tr("Latest version")} </span>

                        <span className="font-semibold text-blue-600">
                            {latestVersion}
                        </span>
                    </div>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-gray-600">
                     {tr("Contact your administrator to update HexoraIT.")} </p>
                <p className="mt-5 text-sm leading-relaxed text-gray-600">
                     {tr("See the latest changes on")} <a href="https://github.com/Lewan24/HexoraIT/releases" target="_blank" className="ml-1 ">
                        <button className="rounded-lg ml-2 bg-green-600 px-2 py-1 text-sm font-medium text-white transition hover:bg-green-800 active:scale-95 hover:scale-105">
                             {tr("Github/Releases")} </button>
                    </a>
                </p>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose}
                        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95">
                         {tr("Understand")} </button>
                </div>
            </div>
        </div>
    );
}