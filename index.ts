import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// 1. Configure AWS provider to use ESC/OIDC credentials
const awsProvider = new aws.Provider("aws-provider", {
  region: "us-east-1", // Match your AWS region
});

// 2. Create S3 bucket with explicit provider
const bucket = new aws.s3.Bucket("static-web-jabri-bucket", {
  website: {
    indexDocument: "index.html",
  },
  // Required for static website hosting:
  acl: "public-read",
}, { provider: awsProvider });

// 3. Upload index.html with proper content type
const bucketObject = new aws.s3.BucketObject("index.html", {
  bucket: bucket.id,
  source: new pulumi.asset.FileAsset("index.html"),
  contentType: "text/html",
  acl: "public-read", // Required for public access
}, { provider: awsProvider });

// 4. Fix CloudFront configuration
const distribution = new aws.cloudfront.Distribution("static-website-distribution", {
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
  priceClass: "PriceClass_100", // Reduce cost
  waitForDeployment: false, // Skip waiting for CF deployment
}, { provider: awsProvider });

// Export URLs
export const bucketUrl = bucket.websiteEndpoint;
export const distributionUrl = distribution.domainName;
