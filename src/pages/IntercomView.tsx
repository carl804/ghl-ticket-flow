export default function IntercomView() {
  return (
    <div className="h-screen w-full">
      <iframe
        src="https://app.intercom.com/a/inbox/bqo45ebi/inbox/shared/all"
        className="w-full h-full border-0"
        title="Intercom Inbox"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}