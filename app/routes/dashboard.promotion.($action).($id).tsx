import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useSubmit, useFetcher } from '@remix-run/react';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FaImage } from 'react-icons/fa6';
import { z } from 'zod';
import TableWidget from '~/components/TableWidget';
import Button from '~/components/ui/Button';
import SelectDropdown from '~/components/ui/Dropdown';
import Input from '~/components/ui/Input';
import { InputLabel } from '~/components/ui/Search';
import TextArea from '~/components/ui/TextArea';
import { GenericAPI } from '~/lib/types';
import { callAPI, getUserAccessToken } from '~/session.server';
import { useNavigate } from 'react-router-dom';
import Accordion, { type AccordionRef } from '~/components/ui/Accordion';
import { FaQrcode, FaArchive, FaFile, FaTrashRestore, FaCheck } from 'react-icons/fa';
import { FaXmark } from 'react-icons/fa6';
import { IoMdAddCircle } from 'react-icons/io';
import DialogModal, { ModalBox } from '~/components/ui/Dialog';
import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import Cropper, { ReactCropperElement } from 'react-cropper';
import Spinner from '~/components/ui/Spinner';
import QuillComponent from '../components/ui/RichTextEditor';
import QRCode from 'qrcode.react';
import HoverCard from '~/components/ui/HoverCard';
import { MdEdit } from 'react-icons/md';
import { RiDeleteBinLine } from 'react-icons/ri';
import type { GraphQLReturn } from '~/lib/types';
import SearchableDropdown from '~/components/ui/Combobox';

const thumbSize = 320;
type TableRowProps = {
  animalUuid: string;
  animalId: string;
  name: string;
  onClick: (id: string) => void;
  isSelected: boolean;
  herdCode: string;
  surcharge: number;
  description?: string;
  i: number;
};
type LoadDefault = {
  promotionId: string;
  action: string;
  promotionDetails?: {
    ID: string;
    name: string;
    breed: string;
    basePrice: string;
    breedDisplay: string;
    description: string;
    sections: { title: string; description: string }[];
    listings: {
      animalUuid: string;
      animalId: string;
      name: string;
      herdCode: string;
    }[];
  };
  breedPhoto: string;
  businessId?: string;
  breedList?: [];
  animalIdList?: [];
  origin?: string
};
type ActionDefault = {
  fieldErrors?: {
    [key: string]: string[];
  };
  status: string;
  errors: string;
  message: string;
  action?: string;
  promotionId?: string;
  businessId?: string;
};
type promotionFormDataType = {
  name: string;
  breed: string;
  basePrice: string;
  breedDisplay: string;
  description: string;
  promotionId: string;
  sections: { title: string; description: string }[];
  animalUuid?: string;
  animalId?: string;
  surcharge?: string;
  animalDescription?: string;
  sectionDescription?: string;
  sectionTitle?: string;
};
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { action, id } = params;
  const origin = new URL(request.url).origin
  const { userData, accessToken } = await getUserAccessToken(request, true);
  if (
    (action == undefined && id == undefined) ||
    (action && id && (action === 'view' || action === 'edit')) ||
    (action && action === 'create' && id === undefined)
  ) {
    const breedListQuery = `
    query {
      groupAnimalViews{
        aggregates{
          distinctItems{
            breed 
          }
        }
      }
    }`;
    const breedListRes = await callAPI<GraphQLReturn>(
      request,
      '/api/graphql',
      { query: breedListQuery },
      undefined,
      accessToken
    );
    let breedList = [];
    if (breedListRes.success) {
      breedList = breedListRes.response.data.groupAnimalViews.aggregates.distinctItems.breed
        .filter((i: string) => i !== '')
        .map((i: string) => {
          return { label: i, value: i };
        });
    }
    if (action && id) {
      const promotionDetails = await callAPI<GenericAPI>(request, `/api/promotion/${id}`, undefined, 'GET');
      if (promotionDetails.success && promotionDetails.response.data) {
        const client = new S3Client({
          region: 'ap-southeast-2'
        });

        let breedphoto = '';
        const command = new GetObjectCommand({
          Bucket: 'easydairy-public',
          Key: `userUploads/${userData['BusinessID']}/${id}.jpg`,
        });
        try {
          const response = await client.send(command);
          // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
          const str = await response.Body?.transformToByteArray();
          if (str) {
            breedphoto = 'data:image/jpeg;base64,' + Buffer.from(str).toString('base64');
          }
        } catch (err) {
          // console.error(err);
        }
        const animalIdListQuery = `
          query {
            groupAnimalViews (filter: { breed: { equalTo: "${promotionDetails.response.data.breed}" } }) {
              nodes {
                animalId
                animalUuid  
                status
              }
            }
          }
        `;
        const animalIdListRes = await callAPI<GraphQLReturn>(
          request,
          '/api/graphql',
          { query: animalIdListQuery },
          undefined,
          accessToken
        );
        let animalIdList = [];
        if (animalIdListRes.success) {
          animalIdList = animalIdListRes.response.data.groupAnimalViews.nodes.filter((it: any) => it.status !== 'Dead' && it.status !== 'Sold' && it.animalId !== null).map((i: any) => {
            return { label: i.animalId, value: i.animalUuid, status: i.status };
          });
        }
        return json({
          action: action,
          promotionId: id,
          promotionDetails: promotionDetails.response.data,
          breedPhoto: breedphoto,
          businessId: userData.BusinessID,
          breedList: breedList,
          animalIdList: animalIdList,
          origin: origin
        });
      } else {
        return redirect('/dashboard/promotion');
      }
    } else if (action === 'create') {
      return json({
        action: action,
        breedList: breedList,
      });
    } else if (action == undefined && id == undefined) {
      return json({
        action: action,
        promotionId: id,
        businessId: userData.BusinessID,
        breedList: breedList,
        origin: origin
      });
    }
  } else {
    return redirect('/dashboard/promotion');
  }
  return json({});
}

const sectionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});
const baseAddPromotionSchema = z.object({
  name: z.string().min(1, 'Promotion Name is required'),
  breed: z.string().min(1, 'Breed is required'),
  basePrice: z.number().min(1, 'Base Price is required'),
  breedDisplay: z.string().min(1, 'Breed Display Name is required'),
  description: z.string().optional(),
  sections: z.array(sectionSchema).optional(),
});
const baseEditPromotionSchema = z.object({
  promotionId: z.string().min(1, 'Promotion ID is required'),
  name: z.string().min(1, 'Promotion Name is required'),
  basePrice: z.number().min(1, 'Base Price is required'),
  breedDisplay: z.string().min(1, 'Breed Display Name is required'),
  description: z.string().optional(),
  selectedRows: z.array(z.string()).optional(),
  sections: z.array(sectionSchema).optional(),
});
const baseArchivePromotionSchema = z.object({
  promotionId: z.string().min(1, 'Promotion ID is required'),
  status: z.string().min(1, 'Status is required'),
});
const baseAnimalSchema = z.object({
  promotionId: z.string().min(1, 'Promotion ID is required'),
  animalUuid: z.string().min(1, 'Animal ID is required'),
  surcharge: z.number().min(1, 'Surcharge is required'),
  description: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const { userData } = await getUserAccessToken(request, true);
  const formData = await request.formData();
  const requestData = Object.fromEntries(formData);
  if ('action' in requestData) {
    let validation = null;
    let url = '';
    let method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST';
    let data: any = {};
    if (requestData.basePrice || requestData.surcharge) {
      formData.forEach((value, key) => {
        data[key] = key === 'basePrice' || key === 'surcharge' ? Number(value) : value;
      });
    } else {
      data = requestData;
    }
    if (requestData.selectedRows) {
      data['selectedRows'] = JSON.parse(requestData.selectedRows as string);
    }
    if (requestData.sections) {
      data['sections'] = JSON.parse(requestData.sections as string);
    }
    if (requestData.animalDescription) {
      const desc = requestData.animalDescription;
      data['description'] = desc;
    }
    switch (formData.get('action')) {
      case 'create':
        validation = baseAddPromotionSchema.safeParse(data);
        url = '/api/promotion';
        method = 'POST';
        break;
      case 'edit':
        validation = baseEditPromotionSchema.safeParse(data);
        url = `/api/promotion/${data.promotionId}`;
        method = 'PUT';
        break;
      case 'archive':
        validation = baseArchivePromotionSchema.safeParse(data);
        url = `/api/promotion/${data.promotionId}/status`;
        method = 'PUT';
        break;
      case 'addAnimal':
        validation = baseAnimalSchema.safeParse(data);
        url = `/api/promotion/${data.promotionId}/animal`;
        method = 'POST';
        break;
      case 'editAnimal':
        validation = baseAnimalSchema.safeParse(data);
        url = `/api/promotion/${data.promotionId}/animal`;
        method = 'PUT';
    }
    if (formData.get('action') === 'image') {
      const imgName = formData.get('name');
      const imgData = await (formData.get('image') as Blob).arrayBuffer();
      const client = new S3Client({
        region: 'ap-southeast-2'
      });
      const mainImg = new PutObjectCommand({
        Bucket: 'easydairy-public',
        Key: `userUploads/${imgName}`,
        Body: Buffer.from(imgData),
        ContentType: 'image/jpeg',
      });
      try {
        await client.send(mainImg);
        return json({ status: 'img_success', errors: '' });
      } catch (err) {
        console.error(err);
        return json({ status: 'img_error', errors: err });
      }
    }
    if (validation) {
      if (!validation.success) {
        const fieldErrors = validation.error.flatten()?.fieldErrors;
        return json({
          status: 'validation error',
          message: null,
          userId: null,
          errors: null,
          fieldErrors: fieldErrors,
        });
      } else {
        if (formData.get('action') === 'edit' && 'selectedRows' in validation.data && validation.data.selectedRows != null && validation.data.selectedRows.length) {
          validation.data.selectedRows.forEach(async (id: string) => {
            const delRes = await callAPI<GenericAPI>(
              request,
              `/api/promotion/${data.promotionId}/animal`,
              { promotionId: data.promotionId, animalUuid: id },
              'DELETE'
            );
            if (!delRes.success) {
              return json({
                status: 'api error',
                message: !delRes.success ? (delRes.response.errors as string) : delRes.response.message,
                errors: null,
                fieldErrors: null,
              });
            }
          });
        }
        const res = await callAPI<GenericAPI>(request, url, validation.data, method);
        if (!res.success) {
          return json({
            status: 'api error',
            message: !res.success ? (res.response.errors as string) : res.response.message,
            errors: null,
            fieldErrors: null,
          });
        } else {
          return json({
            status: 'success',
            message: res.response.message,
            errors: null,
            fieldErrors: null,
            action: formData.get('action'),
            promotionId: res.response.data?.id ?? null,
            businessId: userData.BusinessID,
          });
        }
      }
    }
  }
}

export default function Promotion() {
  const submit = useSubmit();
  const fetcher = useFetcher<{ [key: string]: string }>();
  const animalPhotoFetcher = useFetcher<{ [key: string]: string }>();
  const actionData = useActionData<ActionDefault>();
  const loaderData = useLoaderData<LoadDefault>();
  const promotionDetails = loaderData.promotionDetails;
  const [activeTab, setActiveTab] = useState<string>(loaderData.action ?? 'list');
  const [breed, setBreed] = useState<string>(promotionDetails?.breed ?? '');
  const [breedList, setBreedList] = useState<[]>(loaderData.breedList ?? []);
  const [errors, setErrors] = useState(actionData?.fieldErrors ?? {})
  const [animalList, setAnimalList] = useState<[]>(loaderData.animalIdList ?? []);
  const accordionSectionRef = useRef<(AccordionRef | null)[]>([])
  const [breedPhoto, setBreedPhoto] = useState(loaderData.breedPhoto);
  const [animalPhoto, setAnimalPhoto] = useState('');
  const [imgBlob, setImgBlob] = useState<Blob | null>(null);
  const cropperRef = useRef<ReactCropperElement>(null);
  const [spinnerActive, setSpinnerActive] = useState(false);
  const [cropImg, setCropImg] = useState({ img: '', width: 0, height: 0 });
  const [modalContent, setModalContent] = useState<{
    open: boolean;
    animalUuid?: string;
    isAnimal?: boolean;
  }>({
    open: false,
  });
  const [sectionModalContent, setSectionModalContent] = useState<{
    open: boolean;
  }>({
    open: false,
  });
  const [qrModal, setQrModal] = useState<{ open: boolean; name: string; url: string }>({
    open: false,
    name: '',
    url: ''
  });
  const [archiveModal, setArchiveModal] = useState<{ open: boolean; promotionId: string; status: string }>({
    open: false,
    promotionId: '',
    status: '',
  });
  const [dialogModal, setDialogModal] = useState<{ open: boolean; action?: string }>({ open: false });
  const [formData, setFormData] = useState<promotionFormDataType>({
    name: promotionDetails?.name ?? '',
    breed: promotionDetails?.breed ?? '',
    basePrice: promotionDetails?.basePrice ?? '',
    breedDisplay: promotionDetails?.breedDisplay ?? '',
    description: promotionDetails?.description ?? '',
    sections: promotionDetails?.sections ?? [],
    promotionId: promotionDetails?.ID ?? '',
  });
  const [accordionSectionShow, setAccordionSectionShow] = useState<boolean[]>([]);
  const TableRow: React.FC<TableRowProps> = ({
    animalId,
    name,
    herdCode,
    surcharge,
    onClick,
    isSelected,
    description,
    animalUuid,
    i,
  }) => {
    return (
      <tr
        key={animalId}
        className={`border-t whitespace-nowrap ${isSelected ? 'bg-error-300' : (i % 2 !== 0 ? 'bg-gray-100' : '')}`}
      >
        <td className='p-3'>{animalId}</td>
        <td className='p-3'>{name}</td>
        <td className='p-3'>{herdCode}</td>
        <td className='p-3'>{surcharge}</td>
        <td className='p-3'>
          {activeTab === 'view' ? (
            <div className='flex gap-1'>
              <HoverCard closeDelay={0} openDelay={0}>
                <HoverCard.Trigger asChild>
                  <FaQrcode
                    className='text-2xl'
                    onClick={() =>
                      setQrModal({
                        open: true,
                        name: name,
                        url: `/promotion/${loaderData.promotionId}/${animalUuid}`
                      })
                    }
                  />
                </HoverCard.Trigger>
                <HoverCard.Content
                  role='tooltip'
                  className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800'
                  side='top'
                >
                  QR Code
                </HoverCard.Content>
              </HoverCard>
              <HoverCard closeDelay={0} openDelay={0}>
                <HoverCard.Trigger asChild>
                  <FaFile
                    className='text-2xl'
                    onClick={() => {
                      setModalContent((prev) => ({
                        ...prev, 
                        open: true,
                        animalUuid: animalUuid,
                      }));
                      setFormData((prevData) => ({
                        ...prevData,
                        ['animalId']: animalId,
                        ['surcharge']: surcharge.toString(),
                        ['animalDescription']: description,
                        ['animalUuid']: animalUuid,
                      }));
                      animalPhotoFetcher.load(`/dashboard/promoAnimalPhoto/${loaderData.businessId}/${animalUuid}`);
                    }}
                  />
                </HoverCard.Trigger>
                <HoverCard.Content
                  role='tooltip'
                  className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800'
                  side='top'
                >
                  View Details
                </HoverCard.Content>
              </HoverCard>
            </div>
          ) : (
            <div className='flex gap-1'>
              {!isSelected && (
                <HoverCard closeDelay={0} openDelay={0}>
                  <HoverCard.Trigger asChild>
                    <MdEdit
                      className='text-2xl'
                      onClick={() => {
                        setModalContent({
                          open: true,
                          animalUuid: animalUuid,
                          isAnimal: true,
                        });
                        setFormData((prevData) => ({
                          ...prevData,
                          ['animalId']: animalId,
                          ['surcharge']: surcharge.toString(),
                          ['animalDescription']: description,
                          ['animalUuid']: animalUuid,
                        }));
                        animalPhotoFetcher.load(`/dashboard/promoAnimalPhoto/${loaderData.businessId}/${animalUuid}`);
                      }}
                    />
                  </HoverCard.Trigger>
                  <HoverCard.Content
                    role='tooltip'
                    className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800'
                    side='top'
                  >
                    Edit
                  </HoverCard.Content>
                </HoverCard>
              )}
              {!isSelected ? (
                <HoverCard closeDelay={0} openDelay={0}>
                  <HoverCard.Trigger asChild>
                    <RiDeleteBinLine className='text-2xl' onClick={() => onClick(animalUuid)} />
                  </HoverCard.Trigger>
                  <HoverCard.Content
                    role='tooltip'
                    className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800'
                    side='top'
                  >
                    Delete
                  </HoverCard.Content>
                </HoverCard>
              ) : (
                <HoverCard closeDelay={0} openDelay={0}>
                  <HoverCard.Trigger asChild>
                    <FaTrashRestore className='text-2xl' onClick={() => onClick(animalUuid)} />
                  </HoverCard.Trigger>
                  <HoverCard.Content
                    role='tooltip'
                    className='rounded py-2 px-4 text-center pointer-events-none shadow-[hsl(206_22%_7%_/_55%)_0px_0px_3px_-1px,hsl(206_22%_7%_/_20%)_0px_12px_12px_-8px] text-grey-800'
                    side='top'
                  >
                    Restore
                  </HoverCard.Content>
                </HoverCard>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const handleRowClick = (rowId: string) => {
    const isSelected = selectedRows.includes(rowId);
    if (isSelected) {
      setSelectedRows(selectedRows.filter((id) => id !== rowId));
    } else {
      setSelectedRows([...selectedRows, rowId]);
    }
  };
  const navigate = useNavigate();
  const handleRowData = (rowData: { [key: string]: Array<any> }) => {
    if (rowData) {
      if (rowData.rowData) {
        for (const item of rowData.rowData) {
          item.action = (
            <div className='overflow-hidden -z-1 flex gap-3'>
              {item.status !== 'archived' && <FaQrcode
                className='text-2xl'
                onClick={() =>
                  setQrModal({
                    open: true,
                    name: item.name,
                    url: `/promotion/${item.id}`,
                  })
                }
              />}
              <FaArchive
                className='text-2xl'
                onClick={() =>
                  setArchiveModal({
                    open: true,
                    promotionId: item.id,
                    status: item.status,
                  })
                }
              />
            </div>
          );
        }
      }
    }
  };
  const triggerRecalculateHeight = (idx: number) => {
    accordionSectionRef.current[idx]?.recalcHeight()
  }
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes('sectionTitleArr')) {
      const match = name.match(/-(\d+)/);
      if (match) {
        setFormData((prevData) => {
          const updatedSections = prevData.sections.map((section, index) => {
            if (index === Number(match[1])) {
              return { ...section, title: value };
            }
            return section;
          });
          return { ...prevData, sections: updatedSections };
        });
      }
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    }
  };
  const handleArchivePromotion = async () => {
    const promotionId = archiveModal.promotionId;
    const status = archiveModal.status;

    const newStatus = status === 'archived' ? 'active' : 'archived';

    const formData = new FormData();
    formData.append('promotionId', promotionId);
    formData.append('status', newStatus);
    formData.append('action', 'archive');

    submit(formData, { method: 'post' });
    setArchiveModal({
      open: false,
      promotionId: '',
      status: '',
    });
  };
  const printElementRef = useRef<HTMLDivElement>(null);
  const printPDF = () => {
    if (printElementRef.current) {
      document.querySelector('main')?.classList.add('print:hidden');
      const newContainer = document.createElement('div');
      newContainer.innerHTML = printElementRef.current!.innerHTML;
      document.body.append(newContainer);
      window.print();
      document.body.removeChild(newContainer);
      document.querySelector('main')?.classList.remove('print:hidden');
    }
  };
  const uploadImg = useCallback(() => {
    if (typeof cropperRef.current?.cropper !== 'undefined') {
      let canvas = document.createElement('canvas');
      canvas.width = thumbSize;
      canvas.height = thumbSize;
      let c = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let blobObj: Blob;
      cropperRef.current.cropper
        .getCroppedCanvas({
          width: cropImg.width,
          height: cropImg.height,
        })
        .toBlob(
          (blob) => {
            img.src = URL.createObjectURL(blob!);
            if (modalContent.isAnimal) {
              setAnimalPhoto(img.src);
            } else {
              setBreedPhoto(img.src);
            }
            blobObj = blob!;
          },
          'image/jpeg',
          0.7
        );
      img.onload = async () => {
        c?.drawImage(img, 0, 0, thumbSize, thumbSize);
        setImgBlob(blobObj);
        setCropImg({ img: '', width: 0, height: 0 });
      };
    }
  }, [loaderData.promotionId, loaderData.businessId, cropImg.width, cropImg.height]);
  const handleSelectChange = (selected:{label: string, value: string, status?: boolean}) => {
    setFormData((prevData) => ({ ...prevData, ['animalUuid']: selected.value, ['animalId']: selected.label }));
  };
  useEffect(() => {
    if (actionData?.status) {
      if (actionData.status === 'success' && imgBlob) {
        let body = new FormData();
        let image = '';
        let name = '';
        let businessId = loaderData.businessId ?? actionData.businessId;
        if (formData.animalUuid) {
          image = name = `${businessId}/${formData.animalUuid}_promo`;
        } else {
          image = name = `${businessId}/${loaderData.promotionId ?? actionData.promotionId}`;
        }
        body.set('image', imgBlob, `${image}.jpg`);
        body.set('name', `${name}.jpg`);
        body.set('action', `image`);
        fetcher.submit(body, { method: 'POST', encType: 'multipart/form-data' });
        setImgBlob(null);
      } else {
        setDialogModal({ open: true, action: actionData?.action });
      }
    }
  }, [actionData]);
  useEffect(() => {
    setSpinnerActive(false);
    if (fetcher.data?.status === 'img_success' && (activeTab === 'create'|| activeTab === 'edit')) {
      setDialogModal({ open: true, action: activeTab });
    }
  }, [fetcher.data]);
  useEffect(() => {
    // if (fetcher.data?.animalPhoto) {
      setAnimalPhoto(animalPhotoFetcher.data?.animalPhoto ?? '')
    // }
  }, [animalPhotoFetcher]);
  useEffect(() => {
    setAccordionSectionShow((prevData) => {
      let newArr: boolean[] = []
      if (formData.sections.length > 0) {
        formData.sections.map((v, i) => {
            newArr[i] = false
        })
      }
      return newArr
    })
  }, [formData.sections.length]);
  useEffect(() => {
    setErrors(actionData?.fieldErrors ?? {})
  }, [actionData?.fieldErrors])
  useEffect(() => {
    formData.sections.map((v,i) => {
      triggerRecalculateHeight(i)
    })
  }, [formData.sections])
  return (
    <>
      {cropImg.img && (
        <div className='fixed inset-0 z-40 flex flex-col gap-2 items-center p-4 bg-white/75 backdrop-blur-sm overflow-auto'>
          <Cropper
            src={cropImg.img}
            // className="flex-grow"
            // style={{ width: "100%" }}
            // Cropper.js options
            initialAspectRatio={1}
            aspectRatio={1}
            minCropBoxHeight={320}
            minCropBoxWidth={320}
            // autoCrop={false}
            autoCropArea={1}
            guides={true}
            // zoomTo={0.5}
            viewMode={2}
            background={false}
            zoomable={false}
            // crop={() => {
            //   if (typeof cropperRef.current?.cropper !== "undefined") {
            //     setAnimalImg(cropperRef.current?.cropper.getCroppedCanvas().toDataURL());
            //   }
            // }}
            ref={cropperRef}
          />
          <fetcher.Form method='POST' className='w-full flex justify-center gap-10'>
            <Button type='button' variant='outline' onClick={() => setCropImg({ img: '', width: 0, height: 0 })}>
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => {
                uploadImg();
                if (modalContent.isAnimal) setModalContent((prev) => ({...prev, open: true, isAnimal: false }));
              }}
            >
              Crop & Save
            </Button>
          </fetcher.Form>
        </div>
      )}
      <Spinner active={spinnerActive} />
      <DialogModal
        isOpen={dialogModal.open}
        icon={(actionData?.status === 'success' && fetcher.data?.status !== 'img_error') ? 'success' : 'error'}
        color={(actionData?.status === 'success' && fetcher.data?.status !== 'img_error') ? 'primary' : 'error'}
        title={(actionData?.status === 'success' && fetcher.data?.status !== 'img_error') ? 'Success' : 'Error'}
        message={
          (actionData?.action === 'create' && actionData?.status === 'success')
            ? 'Add Animals to this promotion now?'
            : actionData?.errors || actionData?.message || fetcher.data?.errors
        }
        buttons={
          (actionData?.action === 'create' && actionData?.status === 'success')
            ? [
                {
                  text: 'Yes',
                  variant: 'primary',
                  className: 'mt-2 mr-5',
                  onClick: () => {
                    setDialogModal({ open: false });
                    if (dialogModal.action && dialogModal.action === 'create') {
                      navigate(`/dashboard/promotion/edit/${actionData?.promotionId}`);
                    }
                  },
                },
                {
                  text: 'No',
                  variant: 'outline',
                  className: 'mt-2',
                  onClick: () => {
                    setDialogModal({ open: false });
                    navigate(`/dashboard/promotion`);
                  },
                },
              ]
            : [
                {
                  text: 'Close',
                  variant: 'black',
                  className: 'mt-2',
                  onClick: () => {
                    setDialogModal({ open: false });
                    if (dialogModal.action && dialogModal.action === 'archive') {
                      window.location.reload();
                    }
                    if (actionData?.status === 'success' && fetcher.data?.status !== 'img_error') {
                      setModalContent({
                        open: false,
                        animalUuid: undefined,
                        isAnimal: undefined,
                      });
                      if (actionData.action === 'edit') {
                        navigate(`/dashboard/promotion`);
                      }
                    }
                  },
                },
              ]
        }
      />
      <DialogModal
        isOpen={archiveModal.open}
        title='Change promotion status'
        message={`Are you sure you want to ${
          archiveModal.status === 'archived' ? 'unarchive' : 'archive'
        } this promotion?`}
        buttons={[
          {
            text: 'Confirm',
            variant: 'primary',
            className: 'mr-5 mt-6',
            onClick: handleArchivePromotion,
          },
          {
            text: 'Cancel',
            variant: 'outline',
            onClick: () => {
              setArchiveModal({ open: false, promotionId: '', status: '' });
            },
          },
        ]}
      />
      <ModalBox
        isOpen={modalContent.open}
        classes='w-full max-w-3xl relative'
        onClose={() => {
          setModalContent((prev) => ({ ...prev, open: false, animalId: undefined, isAnimal: undefined, animalUuid: undefined }));
          setAnimalPhoto('');
          setErrors({})
          setFormData((prevData) => ({
            ...prevData,
            ['animalId']: undefined,
            ['surcharge']: undefined,
            ['animalDescription']: undefined,
            ['animalUuid']: undefined,
          }));
        }}
        title={`${activeTab === 'view' ? 'View' : !modalContent.animalUuid ? 'Add' : 'Edit'} Animal`}
      >
        <Form className='flex-col px-8 max-h-[400px] md:max-h-[600px] overflow-auto' method='post'>
          <div className='flex mb-8 gap-10 justify-between'>
            <div className='flex-col grow text-left'>
              <div className='flex'>
                {modalContent.animalUuid 
                  ?
                    <Input
                      className={`mb-5 md:mb-0 ${
                        activeTab === 'view' || modalContent.animalUuid ? 'border-none pl-0' : ''
                      }`}
                      value={formData.animalId}
                      readOnly={true}
                      label='Animal ID'
                    />
                  :
                    <SearchableDropdown
                      error={errors?.['animalUuid']?.[0]}
                      value={formData.animalId}
                      placeholder={modalContent.animalUuid ? undefined : 'Search...'}
                      name='animalId'
                      label='Animal ID'
                      className={`mb-5 md:mb-0 ${
                        activeTab === 'view' || modalContent.animalUuid ? 'border-none pl-0' : ''
                      }`}
                      options={animalList}
                      onSelectChange={handleSelectChange}
                    />
                }
                {/* {formData.animalId && formData.animalUuid && !modalContent.animalUuid && (
                  <FaCheck className='text-green-500 mt-10 ml-2' />
                )}
                {formData.animalId && !formData.animalUuid && !modalContent.animalUuid && (
                  <FaXmark className='text-error-500 mt-10 ml-2' />
                )} */}
              </div>
              <Input name='animalUuid' type='hidden' value={formData.animalUuid} />
            </div>
            <div className='flex-col text-left'>
              <Input
                className={`mb-5 md:mb-0 ${activeTab === 'view' ? 'border-none pl-0' : ''}`}
                error={errors?.['surcharge']?.[0]}
                type='number'
                value={formData.surcharge}
                onChange={handleChange}
                readOnly={activeTab === 'view' ? true : false}
                name='surcharge'
                label='
                Surcharge ($)'
              />
            </div>
          </div>
          <Input type='hidden' name='promotionId' value={formData.promotionId} />
          <div className='min-h-[50px]'>
            <InputLabel className='float-left mb-2'>
              Additional Information <span className='text-grey-400 font-light text-sm'>(Optional)</span>
            </InputLabel>
            <label htmlFor='animalphoto' className='self-center hover:underline items-center w-full h-full'>
              {activeTab === 'create' || activeTab === 'edit' ? (
                animalPhoto ? (
                  <div className='relative'>
                    <img src={animalPhoto} className='w-full aspect-square' alt='breed' />
                    <div className='cursor-pointer z-10 absolute inset-0 bg-white/80 flex opacity-0 hover:opacity-100 items-center justify-center underline text-primary-500 p-2'>
                      <span>Replace Image</span>
                    </div>
                  </div>
                ) : (
                  <div className='h-full w-full bg-gray-300 flex gap-2 justify-center items-center cursor-pointer min-h-[270px] max-h-[270px] mb-10'>
                    <FaImage />
                    <span>Upload Image</span>
                  </div>
                )
              ) : animalPhoto ? (
                <img src={animalPhoto} className='w-full aspect-square' alt='breed' />
              ) : (
                ''
              )}
            </label>
            {(activeTab === 'create' || activeTab === 'edit') && 
              <input
                id='animalphoto'
                type='file'
                accept='image/*'
                onChange={(e) => {
                  if (e.target.value && e.target.files?.length) {
                    const reader = new FileReader();
                    reader.addEventListener('load', () => {
                      const img = new Image();
                      img.onload = () => {
                        setModalContent((prev) => ({...prev, open: false, isAnimal: true }));
                        setErrors({})
                        setCropImg({ img: reader.result as string, width: img.naturalWidth, height: img.naturalHeight });
                        e.target.value = '';
                      };
                      img.src = reader.result as string;
                    });
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
                className='hidden'
              />
            }
          </div>
          <QuillComponent
            theme={'snow'}
            value={formData.animalDescription}
            className='mb-5'
            readOnly={activeTab === 'view' ? true : false}
            modules={
              activeTab === 'view'
                ? {
                    toolbar: false,
                  }
                : undefined
            }
            onChange={(newValue, delta, source) => {
              if (source === 'user') {
                setFormData((prevData) => ({ ...prevData, ['animalDescription']: newValue }));
              }
            }}
          />
          <Input type='hidden' name='animalDescription' value={formData.animalDescription} />
          {activeTab === 'edit' && (
            <div className='flex justify-between'>
              <Button
                name='action'
                children='Save'
                type='submit'
                value={modalContent.animalUuid ? 'editAnimal' : 'addAnimal'}
              />
              <Button
                variant='outline'
                onClick={() => {
                  setModalContent({
                    open: false,
                    animalUuid: undefined,
                    isAnimal: undefined,
                  });
                  setFormData((prevData) => ({
                    ...prevData,
                    ['animalId']: undefined,
                    ['surcharge']: undefined,
                    ['animalDescription']: undefined,
                    ['animalUuid']: undefined,
                  }));
                  setAnimalPhoto('');
                  setErrors({})
                }}
                children='Cancel'
              />
            </div>
          )}
        </Form>
      </ModalBox>
      <ModalBox
        isOpen={qrModal.open}
        classes='w-full max-w-sm h-/2 relative'
        onClose={() => setQrModal((prev) => ({ ...prev, open: false }))}
        title={qrModal.name}
      >
        <div className='flex-col px-8'>
          <div ref={printElementRef}>
            <QRCode value={`${loaderData.origin+qrModal.url}`} size={270} className='mb-10' level={'H'} />
          </div>
          <div className='flex justify-between pb-5'>
            <Button children='Print' className='print:hidden' onClick={printPDF} />
            <Button
              variant='outline'
              className='print:hidden'
              onClick={() =>
                setQrModal({
                  open: false,
                  name: '',
                  url: ''
                })
              }
            >
              Cancel
            </Button>
          </div>
        </div>
      </ModalBox>
      <ModalBox
        isOpen={sectionModalContent.open}
        classes='w-full max-w-3xl relative'
        onClose={() => {
          setSectionModalContent((prev) => ({ ...prev, open: false }))
          setFormData((prevData) => ({
            ...prevData,
            ['sectionTitle']: undefined,
            ['sectionDescription']: undefined
          }));
        }}
        title={`Add Section`}
      >
        <Form className='flex-col px-8 max-h-[400px] md:max-h-[600px] overflow-auto' method='post'>
          <div className='text-left'>
            <Input
              label={'Section Title'}
              error={errors?.['basePrice']?.[0]}
              className={`mb-5 ${activeTab === 'view' ? 'border-none pl-0' : ''}`}
              readOnly={activeTab === 'view' ? true : false}
              value={formData.sectionTitle}
              onChange={handleChange}
              name='sectionTitle'
            />
          </div>
          <InputLabel className='mb-1.5 text-left'>Section Description</InputLabel>
          <QuillComponent
            theme={'snow'}
            value={formData.sectionDescription}
            readOnly={activeTab === 'view' ? true : false}
            modules={
              activeTab === 'view'
                ? {
                    toolbar: false,
                  }
                : undefined
            }
            className='mb-5'
            onChange={(newValue, delta, source) => {
              if (source === 'user') {
                setFormData((prevData) => ({ ...prevData, ['sectionDescription']: newValue }));
              }
            }}
          />
          <div className='flex justify-between'>
            <Button
              name='action'
              children='Save'
              onClick={() => {
                setSectionModalContent({
                  open: false,
                });
                setFormData((prevData) => {
                  const newArray = [
                    ...prevData.sections,
                    { title: formData.sectionTitle ?? '', description: formData.sectionDescription ?? '' },
                  ];
                  return { ...prevData, sections: newArray };
                });
                setFormData((prevData) => ({
                  ...prevData,
                  ['sectionTitle']: undefined,
                  ['sectionDescription']: undefined
                }));
              }}
            />
            <Button
              variant='outline'
              onClick={() => {
                setSectionModalContent({
                  open: false,
                });
                setFormData((prevData) => ({
                  ...prevData,
                  ['sectionTitle']: undefined,
                  ['sectionDescription']: undefined
                }));
              }}
              children='Cancel'
            />
          </div>
        </Form>
      </ModalBox>
      <div className='bg-grey-100 p-4 z-30'>
        <div className='flex items-center gap-2 md:gap-5 px-1 md:px-4'>
          <Button
            onClick={() => {
              navigate('/dashboard/promotion');
            }}
            className={`${
              activeTab !== 'list' ? 'bg-transparent text-black hover:bg-primary-500 hover:text-white' : ''
            } font-bold`}
            children={'Promotions'}
          />
          <Button
            onClick={() => {
              navigate('/dashboard/promotion/create');
            }}
            className={`${
              activeTab !== 'create' ? 'bg-transparent text-black hover:bg-primary-500 hover:text-white' : ''
            } font-bold`}
            children={'Create Promotion'}
          />
          {(activeTab === 'view' || activeTab === 'edit') && (
            <Button
              className={`${
                activeTab !== 'view' && activeTab !== 'edit'
                  ? 'bg-transparent text-black hover:bg-primary-500 hover:text-white'
                  : ''
              } font-bold`}
              children={`${activeTab === 'view' ? 'View' : 'Edit'} Promotion - ${loaderData.promotionDetails?.name}`}
            />
          )}
        </div>
      </div>
      <div className='flex flex-col gap-5 py-4'>
        <div className='bg-grey-100 pb-6 px-4'>
          <div className='mt-5'>
            <div className='bg-white p-4'>
              {activeTab === 'list' && (
                <TableWidget
                  hideColumnSettings={true}
                  type='animalPromotions'
                  addParams={{ businessId: loaderData.businessId ?? '' }}
                  customColumnData={handleRowData}
                />
              )}
              {activeTab !== 'list' && (
                <div className='mt-5'>
                  <Form className='flex-col' method='post' id='promoForm'>
                    <div className='max-h-fit gap-20 md:flex mb-10'>
                      <div className='md:w-1/3'>
                        <div className='mb-5'>
                          <Input
                            label={'Promotion Name'}
                            className={`${activeTab === 'view' ? 'border-none pl-0' : ''}`}
                            error={errors?.['name']?.[0]}
                            readOnly={activeTab === 'view' ? true : false}
                            value={formData.name}
                            name='name'
                            onChange={handleChange}
                          />
                          {activeTab === 'edit' && (
                            <>
                              <Input type='hidden' name='promotionId' value={formData.promotionId} />
                              <Input type='hidden' name='selectedRows' value={JSON.stringify(selectedRows)} />
                            </>
                          )}
                        </div>
                        <Input type='hidden' name='sections' value={JSON.stringify(formData.sections)} />
                        <div className='lg:flex justify-between gap-5'>
                          <div className='flex-col mb-5'>
                            {activeTab === 'create' ? (
                              <div>
                                <SelectDropdown
                                  label='Breed'
                                  options={breedList}
                                  type={'single'}
                                  onSelectChange={(v) => setBreed(v.value)}
                                  value={breed}
                                  className='min-w-[200px]'
                                />
                                <Input type='hidden' name='breed' value={breed} />
                              </div>
                            ) : (
                              <div className='mb-5'>
                                <Input
                                  label={'Breed'}
                                  className={`min-w-[200px] border-none pl-0`}
                                  readOnly={true}
                                  value={breed}
                                  onChange={handleChange}
                                />
                              </div>
                            )}
                            {errors?.['breed']?.[0] ? (
                              <p className='text-error-500 text-sm text-right'>
                                {errors?.['breed']?.[0]}
                              </p>
                            ) : (
                              ''
                            )}
                          </div>

                          <div className='mb-5'>
                            <Input
                              label={'Base Price ($)'}
                              error={errors?.['basePrice']?.[0]}
                              className={`${activeTab === 'view' ? 'border-none pl-0' : ''}`}
                              readOnly={activeTab === 'view' ? true : false}
                              value={formData.basePrice}
                              name='basePrice'
                              type='number'
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                        <Input
                          label={'Breed Display Name'}
                          className={`mb-5 md:mb-0 ${activeTab === 'view' ? 'border-none pl-0' : ''}`}
                          error={errors?.['breedDisplay']?.[0]}
                          value={formData.breedDisplay}
                          name='breedDisplay'
                          onChange={handleChange}
                        />
                      </div>
                      <div className='md:w-1/3 mb-5 max-h-full'>
                        <InputLabel className='mb-1.5' htmlFor={'breedPhoto'}>
                          Breed Photo
                        </InputLabel>
                        <label htmlFor='breedphoto' className='self-center hover:underline items-center w-full h-full'>
                          {activeTab === 'create' || activeTab === 'edit' ? (
                            breedPhoto ? (
                              <div className='relative'>
                                <img src={breedPhoto} className='w-full aspect-square' alt='breed' />
                                <div className='cursor-pointer z-10 absolute inset-0 bg-white/80 flex opacity-0 hover:opacity-100 items-center justify-center underline text-primary-500 p-2'>
                                  <span>Replace Image</span>
                                </div>
                              </div>
                            ) : (
                              <div className='h-full w-full bg-gray-300 flex gap-2 justify-center items-center cursor-pointer'>
                                <FaImage />
                                <span>Upload Image</span>
                              </div>
                            )
                          ) : breedPhoto ? (
                            <img src={breedPhoto} className='w-full aspect-square' alt='breed' />
                          ) : (
                            ''
                          )}
                        </label>
                        {(activeTab === 'create' || activeTab === 'edit') && (
                          <input
                            id='breedphoto'
                            type='file'
                            accept='image/*'
                            onChange={(e) => {
                              if (e.target.value && e.target.files?.length) {
                                const reader = new FileReader();
                                reader.addEventListener('load', () => {
                                  const img = new Image();
                                  img.onload = () => {
                                    setCropImg({
                                      img: reader.result as string,
                                      width: img.naturalWidth,
                                      height: img.naturalHeight,
                                    });
                                    e.target.value = '';
                                  };
                                  img.src = reader.result as string;
                                });
                                reader.readAsDataURL(e.target.files[0]);
                              }
                            }}
                            className='hidden'
                          />
                        )}
                      </div>
                      <div className='md:w-1/3 max-h-full'>
                        <TextArea
                          label='Marketing Blurb'
                          error={errors?.['description']?.[0]}
                          className={`h-full pl-3 pr-2 ${activeTab === 'view' ? 'border-none pl-0' : ''}`}
                          readOnly={activeTab === 'view' ? true : false}
                          value={formData.description}
                          name='description'
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </Form>
                </div>
              )}
              {
                <div className='mt-5'>
                  {(activeTab === 'view' || activeTab === 'edit' || activeTab === 'create') && (
                      <div className='mt-5 h-full'>
                        {formData.sections && formData.sections.length ? (
                          <div className=''>
                            {formData.sections.map((s, i) => (
                              <Accordion
                                ref={(el) => (accordionSectionRef.current[i] = el)}
                                title={`Section - ${s.title}`}
                                expanded={accordionSectionShow[i]}
                                key={i}
                                setExpand={() => {
                                  setAccordionSectionShow((prevData) => ({
                                    ...prevData,
                                    [i]: !prevData[i]
                                  }))
                                  triggerRecalculateHeight(i)
                                }}
                              >
                              <div className='flex-col py-5 relative'>
                                {(activeTab === 'edit' || activeTab === 'create') && <FaXmark
                                  className='right-0 absolute mt-1 mr-2'
                                  onClick={() => {
                                    setFormData((prevData) => {
                                      const updatedSections = prevData.sections.filter((_, index) => index !== i);
                                      return { ...prevData, sections: updatedSections };
                                    });
                                  }}
                                />}
                                <Input
                                  label={'Section Title'}
                                  className={`mb-5 ${activeTab === 'view' ? 'border-none pl-0' : ''}`}
                                  readOnly={activeTab === 'view' ? true : false}
                                  value={s.title}
                                  onChange={(e) => {
                                    handleChange(e)
                                    triggerRecalculateHeight(i)
                                  }}
                                  name={`sectionTitleArr-${i}`}
                                />
                                <InputLabel className='mb-1.5'>Section Description</InputLabel>
                                <QuillComponent
                                  theme={'snow'}
                                  value={s.description}
                                  readOnly={activeTab === 'view' ? true : false}
                                  modules={
                                    activeTab === 'view'
                                      ? {
                                          toolbar: false,
                                        }
                                      : undefined
                                  }
                                  onChange={(newValue, delta, source) => {
                                    if (source === 'user') {
                                      setFormData((prevData) => {
                                        const updatedSections = prevData.sections.map((section, index) => {
                                          if (index === i) {
                                            return { ...section, description: newValue };
                                          }
                                          return section;
                                        });
                                        return { ...prevData, sections: updatedSections };
                                      });
                                    }
                                    triggerRecalculateHeight(i)
                                  }}
                                />
                              </div>
                          </Accordion>
                            ))}
                          </div>
                        ) : (
                          <div>No section found</div>
                        )}
                        {activeTab === 'edit' && (
                          <div className='flex gap-5 justify-end mt-3'>
                            <Button
                              children='Add Section'
                              variant='outline'
                              onClick={() =>
                                setSectionModalContent({
                                  open: true,
                                })
                              }
                            />
                          </div>
                        )}
                        {activeTab === 'create' && (
                          <div className='flex gap-5 justify-end mt-3'>
                            <Button
                              variant='outline'
                              children='Add Section'
                              onClick={() =>
                                setSectionModalContent({
                                  open: true,
                                })
                              }
                            />
                            <Button name='action' children='Save' type='submit' value='create' form='promoForm'/>
                          </div>
                        )}
                      </div>
                  )}
                  {(activeTab === 'view' || activeTab === 'edit') && (
                    <div>
                      <div className='flex'>
                        <h3 className='md:text-2xl text-xl pt-3 pb-3'>Listings</h3>
                        {activeTab === 'edit' && (
                          <IoMdAddCircle
                            className='text-2xl mt-4 ml-4'
                            onClick={() => {
                              setModalContent((prev) => ({
                                ...prev, 
                                open: true,
                                isAnimal: true,
                              }));
                              setFormData((prevData) => ({
                                ...prevData,
                                ['animalId']: undefined,
                                ['surcharge']: undefined,
                                ['animalDescription']: undefined,
                                ['animalUuid']: undefined,
                              }));
                            }}
                          />
                        )}
                      </div>
                      <div className='overflow-y-auto lg:overflow-x-auto max-h-[450px] print:max-h-none min-h-[300px] scroll-smooth pb-4'>
                        <table className='min-w-full table-print relative'>
                          <thead className='font-signika text-lg'>
                            <tr className='[&>th:first-child]:rounded-l [&>th:last-child]:rounded-r bg-primary-500'>
                              <th className='z-10 px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left rounded-l'>
                                Animal ID
                              </th>
                              <th className='z-10 px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left'>
                                Animal Name
                              </th>
                              <th className='z-10 px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left'>
                                Herd
                              </th>
                              <th className='z-10 px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left'>
                                Surcharge Price ($)
                              </th>
                              <th className='z-10 px-3 py-4 sticky top-0 bg-primary-500 text-white whitespace-nowrap text-left rounded-r'>
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className='text-gray-600 [&_td]:py-3'>
                            {promotionDetails?.listings.length ? (
                              promotionDetails.listings.map((d: { [key: string]: any }, i) => (
                                <TableRow
                                  animalId={d.animalId}
                                  animalUuid={d.animalUuid}
                                  name={d.name}
                                  herdCode={d.herdCode}
                                  surcharge={d.surcharge}
                                  onClick={handleRowClick}
                                  isSelected={selectedRows.includes(d.animalUuid)}
                                  i={i}
                                  key={i}
                                  description={d.description}
                                />
                              ))
                            ) : (
                              <tr>
                                <td className='p-4'>No data found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {activeTab === 'view' && (
                        <div className='flex gap-5 justify-end'>
                          <Button
                            children='Edit'
                            variant='outline'
                            onClick={() => {
                              navigate(`/dashboard/promotion/edit/${loaderData.promotionId}`);
                            }}
                          />
                        </div>
                      )}
                      {activeTab === 'edit' && (
                        <div className='flex gap-5 justify-end'>
                          <Button children='Save Changes' name='action' value='edit' type='submit' form='promoForm' />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
