import { toast } from 'sonner';

export function useToast() {
  return {
    success: (message: string, description?: string) => {
      toast.success(message, {
        description,
      });
    },
    error: (message: string, description?: string) => {
      toast.error(message, {
        description,
      });
    },
    info: (message: string, description?: string) => {
      toast.info(message, {
        description,
      });
    },
    warning: (message: string, description?: string) => {
      toast.warning(message, {
        description,
      });
    },
    loading: (message: string, description?: string) => {
      return toast.loading(message, {
        description,
      });
    },
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ) => {
      return toast.promise(promise, messages);
    },
  };
}
