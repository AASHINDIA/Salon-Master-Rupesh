import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Parse the service account JSON from environment variable
// console.log("process.env.serviceAccount",process.env.serviceAccount)
const serviceAccount = {
  "type": "service_account",
  "project_id": "salon-master-6f8bd",
  "private_key_id": "36667769cdd0038fa7434c1496a7cfe6e0970ba7",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC89TC77r1/Is6N\n03lzUgxkOeJm9z0yzokVR9zni2iy4xzKPh35ch7rZCXxyBA7ZQger/Zs/aoKZO5A\nf/CQgLbfAhNkqTUs7u8voDAhwHXuyBIwka2D4+XsZjcgDuttSmGHDb8UWQOewYFw\nQk0pBW/Y4X+Xm9plTPkptSO0FDS1IqWAH4w20T4u4d/5BKY21mSt5hoRRSI1KGbX\n838d0qT7tobTQgfdWBM/duuUV94nTxW3ENg880tBw7ILPqNK6/bnscna/MD8SRCw\ngK347MAV8JyhWyiZfEo7Zub909K6GSAcF01p/Mpi7x+HvduZp5kEVJYVYZc7o+YA\nLQHGCLolAgMBAAECggEAIGtwClp+jDzgVBCTvp+17Q9KYzCpwRkTB4HuKpLuanzR\ncHiiY207VVc4NGjHMi2WLE+z98S44zIod4wL7fsLhS0hvyxR6YzwIEt7XpsbENYm\nWstvyhh0ly/9ZsRwi66Ol6GZ5meUWa1pJCXX/8EFTOB5p/0vRiCkAk4oG0o5Ndd5\nRmugI/AziFKoL2epsdgexr6u529Z5hZt7789YE21m6MEpFP26N4UTERJrN8Btgw1\nBhS8prVr9M//tsLeILPm1MRdp/zAk0QeP4M50sRimuVbYz0S00RsxYW44OhrKpFQ\nSpE1Gk/gPZYNt9c6KN5/BZkoHYWGt1cgF1qRY2NCAQKBgQD01LbvHP4aIvI9orQs\no5mhpvJwlWfyhZIByJP12kNkNgPH42i5tu86E+KFz22unotaq8YzF5KXyw750NSQ\n+5VlFxCvFwPjB3f7J5xJ3hqlbNZRlpaOP6861oaowhuMufMftQxZ9IFKVo/dsMdo\nuJwV//JIgaGeavCaQctNebhSAQKBgQDFk/R7h3mkxZNQH5jMXi1LYghqqSjCk1Tk\nm/ZX4AxFCfZ4zlsbZPfm9wfysz++L8CdmAhNSeUIFYIUQMDOQGEjc+2fAxiklSOO\n1dn+8FxgvjKHLe7LdpcSkj7Tck2XIzF8MjYnUQKGiDr1mENZwkzODMlmPz2ULQfX\n6Q4dXqTgJQKBgAl9JQnnacHBkPnqkGkafh3RxpuubrTrkFkZWQKyTuJXZZYdrjVk\nbakmlCTzgSC/bE87URcx1rCjYhU0jsh/t66PUko27iOiangFdP036nh222eWGoew\n2C3Dmrx3qXGu00lrTus9mrUy3aiN7WyVmxcPMGi2/XiSVHjmC+cYzJgBAoGBAJ0i\nkLx2AH7VS9Xba1COTgO4Ee2SX4JwXoH6sC8vV1LJG6b0p2zgHnEoYr/ZY4bEv7IW\nqfOeI3MMeAnXfgALH7Zsir1+Xuj2W/NLjTa+vxmJ6vGrzFExHfF9Mk5EiAT9zmty\nG7OlMBcC3bFZyabnauItNTgGb9ka/zPufHVLQmGpAoGBAJHq5c+rKLwGRhHXxMLe\ndtU52a43DV4XPj2SaGz/bOVVr/X3L2A2Ep7/V2wDiIkblzRFEEOVRjzYol4FYQte\nINdHmG8mYgx/vyRK5swxQ3IYbzjwP6a2NRdhyIb50Br83T3/E6RaoXpkByh0F3F8\nwNVzOPU3EuEQ1KNQaMh/Y1AM\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@salon-master-6f8bd.iam.gserviceaccount.com",
  "client_id": "101338099078108801513",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40salon-master-6f8bd.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;