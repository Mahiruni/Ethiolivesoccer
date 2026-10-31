/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode:true,
  poweredByHeader:false,
  images:{remotePatterns:[]},
  async headers(){return [
    {source:'/api/:path*',headers:[{key:'Cache-Control',value:'no-store'},{key:'X-Content-Type-Options',value:'nosniff'}]},
    {source:'/:path*',headers:[{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}]}
  ]}
};
export default config;
