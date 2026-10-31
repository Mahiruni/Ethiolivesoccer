/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode:true,
  poweredByHeader:false,
  images:{remotePatterns:[
    {protocol:'https',hostname:'www.thesportsdb.com',pathname:'/images/media/**'},
    {protocol:'https',hostname:'r2.thesportsdb.com',pathname:'/images/media/**'}
  ]},
  async headers(){return [
    {source:'/api/:path*',headers:[{key:'Cache-Control',value:'no-store'},{key:'X-Content-Type-Options',value:'nosniff'}]},
    {source:'/:path*',headers:[{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}]}
  ]}
};
export default config;
