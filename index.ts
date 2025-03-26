import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Configure AWS provider using ESC environment credentials
const awsProvider = new aws.Provider("aws-provider", {
  region: "us-east-1", // Must match ESC environment region
});

// Create S3 bucket for static website hosting
const bucket = new aws.s3.Bucket("static-website-bucket", {
  website: {
    indexDocument: "index.html",
  },
  acl: "public-read", // Required for public access
}, { provider: awsProvider });

// Upload index.html with proper permissions
const indexHtml = new aws.s3.BucketObject("index.html", {
  bucket: bucket.id,
  source: new pulumi.asset.FileAsset("index.html"),
  contentType: "text/html",
  acl: "public-read", // Required for public access
}, { provider: awsProvider });

// Create CloudFront distribution
const distribution = new aws.cloudfront.Distribution("website-cdn", {
  enabled: true,
  origins: [{
    originId: pulumi.interpolate`s3-${bucket.id}`,
    domainName: bucket.websiteEndpoint,
    customOriginConfig: {
      originProtocolPolicy: "http-only",
      httpPort: 80,
      httpsPort: 443,
      originSslProtocols: ["TLSv1.2"],
    },
  }],
  defaultRootObject: "index.html",
  defaultCacheBehavior: {
    targetOriginId: pulumi.interpolate`s3-${bucket.id}`,
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    forwardedValues: {
      queryString: false,
      cookies: { forward: "none" },
    },
  },
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
  waitForDeployment: false, // Prevent CI/CD timeouts
}, { provider: awsProvider });

// Export URLs
export const websiteUrl = distribution.domainName;
export const s3BucketUrl = bucket.websiteEndpoint;

// Export URLs
export const bucketUrl = bucket.websiteEndpoint;
export const distributionUrl = distribution.domainName;
