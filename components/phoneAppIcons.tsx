export const PHONE_APP_ICONS = {
  downloads: "/phone-icons/downloads.png",
  "play-store": "/phone-icons/play-store.png",
  messages: "/phone-icons/messages.png",
  photos: "/phone-icons/photos.png",
  files: "/phone-icons/files.png",
  settings: "/phone-icons/settings.png",
  phone: "/phone-icons/phone.png",
  camera: "/phone-icons/camera.png",
  drive: "/phone-icons/drive.png",
  youtube: "/phone-icons/youtube.png",
  gmail: "/phone-icons/gmail.png",
  chrome: "/phone-icons/chrome.png",
  meet: "/phone-icons/meet.png",
} as const;

export type PhoneAppIconName = keyof typeof PHONE_APP_ICONS;

export function AppIconImage({ name }: { name: PhoneAppIconName }) {
  return (
    <div className="app-icon app-icon--image">
      <img src={PHONE_APP_ICONS[name]} alt="" className="app-icon__image" draggable={false} />
    </div>
  );
}
