export default function AuthRequired() {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
      <p className="text-sm text-muted-foreground">
        Authentication required to access this page.
      </p>
    </div>
  );
}
