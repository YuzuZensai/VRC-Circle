import { Toaster } from 'sonner';

export function ToasterComponent() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      expand
      richColors
    />
  );
}
