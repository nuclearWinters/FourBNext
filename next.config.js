module.exports = {
  webpack: (config) => {
    config.experiments = config.experiments || {}
    config.experiments.topLevelAwait = true
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fourb-imgs.s3.us-west-2.amazonaws.com',
        port: '',
      },
    ],
  }
}