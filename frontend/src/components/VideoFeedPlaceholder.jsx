import { useT } from "../i18n/i18n.js";

// SRS Tab 1, Component 2: live video feed. Shows a static sample frame until
// the edge camera stream is available.
export default function VideoFeedPlaceholder({ name }) {
  const { t } = useT();
  return (
    <figure className="video-feed">
      <img src="/sample-feed.svg" alt={t("video.alt", { name })} />
      <figcaption>
        <span className="video-feed-tag">{t("video.tag")}</span>
        {t("video.text")}
      </figcaption>
    </figure>
  );
}
