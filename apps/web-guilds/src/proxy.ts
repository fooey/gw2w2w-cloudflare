import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';

export default async function proxy(request: Request) {
  const url = new URL(request.url);

  // Locally intercept /emblem/ paths and send them to the Service Binding
  if (url.pathname.startsWith('/emblem/')) {
    const { env } = getCloudflareContext();

    // 1. Reconstruct the Request object
    // Service Bindings REQUIRE a fully qualified URL (http/https)
    // The hostname doesn't matter for routing, but it must be valid.
    const serviceRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      // @ts-expect-error - Required for some runtime versions to pass body correctly
      duplex: 'half',
    });

    // 2. Pass the "cleaned" request to the service binding
    const workerResponse = await env.SERVICE_EMBLEM.fetch(
      url.toString(),
      serviceRequest,
    );

    // 3. Re-construct the response using the Next.js constructor
    return new NextResponse(workerResponse.body, {
      status: workerResponse.status,
      statusText: workerResponse.statusText,
      headers: workerResponse.headers,
    });
  }

  return NextResponse.next();
}
