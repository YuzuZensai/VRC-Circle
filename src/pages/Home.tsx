import { useAuth } from "@/context/AuthContext";
import { LoginRequired } from "@/components/LoginRequired";

export function Home() {
  const { user } = useAuth();

  if (!user) {
    return <LoginRequired />;
  }

  return (
    <div className="p-8 w-full flex flex-col gap-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Home</h1>
          <p className="text-muted-foreground mt-2">Coming soon</p>
        </div>

        {/* 
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Coming Soon
            </CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent></CardContent>
        </Card> */}
      </div>
    </div>
  );
}
