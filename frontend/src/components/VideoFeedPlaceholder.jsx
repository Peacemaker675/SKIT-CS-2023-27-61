// SRS Tab 1, Component 2: live video feed. Shows a static sample frame until
// the edge camera stream is available.
export default function VideoFeedPlaceholder({ name }) {
  return (
    <figure className="video-feed">
      <img
        src="/sample-feed.svg"
        alt={`Sample camera view${name ? ` for ${name}` : ""}`}
      />
      <figcaption>
        <span className="video-feed-tag">Sample</span>
        Live camera feed not connected yet
      </figcaption>
    </figure>
  );
}
