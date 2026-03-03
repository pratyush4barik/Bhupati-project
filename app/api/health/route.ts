export const runtime = "edge";

export function GET() {
  return new Response("OK", { status: 200 });
}
