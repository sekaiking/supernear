/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@langchain/core",
      "@langchain/google-genai",
      "@langchain/langgraph",
      "@langchain/ollama",
      "node:fs",
    ],
  },
};

export default nextConfig;
