import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import type { GenericAPI } from '~/lib/types';
import { callAPI } from '~/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const client = new S3Client({
    region: 'ap-southeast-2'
  });

  let animalphoto = '';
  const command = new GetObjectCommand({
    Bucket: 'easydairy-public',
    Key: `userUploads/${params.businessId}/${params.id}_promo.jpg`,
  });
  try {
    const response = await client.send(command);
    // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
    const str = await response.Body?.transformToByteArray();
    if (str) {
      animalphoto = 'data:image/jpeg;base64,' + Buffer.from(str).toString('base64');
    }
  } catch (err) {
    // console.error(err);
  }
  return json({
    animalPhoto: animalphoto
  })
}
