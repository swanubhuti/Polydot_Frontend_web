import { useEffect, useState } from 'react';
import Autocomplete from '~/components/ui/Autocomplete';
import { SwitchToggle } from '~/components/ui/Switch';
import moment from 'moment';
import { useFetcher } from 'react-router-dom';
import Button from './ui/Button';
import Checkbox from './ui/Checkbox';

type Props = {
  easyDairyId: string;
  businessId: string;
  prevNotes?: { [key: string]: string };
  prevActiveUntil?: { [key: string]: string };
  prevVisibility?: { [key: string]: boolean };
  onChange: (param: { visible: { [herdUuid: string]: boolean }; notes: { [herdUuid: string]: string }; activeUntilList: { [key: string]: string }, seenIn: {[key: string]: {easyDairyId: string, seenIn: string[]}} }) => void;
  loadVisible?: (visible: { [id: string]: boolean }) => void
};

type Herd = {
  EasyDairyID: string;
  HerdUUID: string;
  HerdCode: string;
  HerdName: string;
  SeenIn: string[] | null;
  LicenseType: string;
  ActiveUntil: string;
  Visible: string | null;
  VisibleAt: string | null;
  Note: string | null;
};

const filterUnchanged = (
  exist: { [id: string]: { visible: boolean; note: string } },
  visible: { [key: string]: boolean },
  notes: { [key: string]: string },
  activeUntilList: { [key: string]: string },
  seenIn: {[key: string]: {easyDairyId: string, seenIn: string[]}}
) => {
  for (let i in visible) {
    //remove those that don't exist in license agreement
    if (!exist[i] && !visible[i] && notes[i] === '') {
      delete visible[i];
      delete notes[i];
      delete activeUntilList[i];
    }
  }
  return { visible, notes, activeUntilList, seenIn };
};

const allValuesTrue = (obj: Record<string, boolean>) => {
  const vals = Object.values(obj);
  return vals.length > 0 && vals.every((v) => v === true);
};

const BusinessHerdsComp = (props: Props) => {
  const [search, setSearch] = useState<{ label: string; value: string }>();

  const fetcher = useFetcher<Herd[]>();

  const [visibility, setVisibility] = useState<{ [id: string]: boolean }>(props.prevVisibility ?? {});
  const [notes, setNotes] = useState<{ [id: string]: string }>(props.prevNotes ?? {});
  const [activeUntilList, setActiveUntilList] = useState<{ [id: string]: string  }>({});
  const [exist, setExist] = useState<{ [id: string]: { visible: boolean; note: string } }>({});
  const [seenIn, setSeenIn] = useState<{ [id: string]: string[] }>({});
  const [failValidationDate, setFailValidationDate] = useState<boolean>(true);
  const [errMsg, setErrMsg] = useState<string>('');
  const [herdEasyDairySwitch, setHerdEasyDairySwitch] = useState<{[key: string]: {easyDairyId: string, seenIn: string[]}}>({})

  useEffect(() => {
    fetcher.load(`/admin/business/${props.businessId}/herds/${props.easyDairyId}`);
  }, [props.businessId, props.easyDairyId]);

  useEffect(() => {
    let vis: { [key: string]: boolean } = {};
    let noteField: { [key: string]: string } = {};
    let activeUntilField: { [key: string]: string } = {};
    let existHerds: typeof exist = {};
    let seen: typeof seenIn = {}
    fetcher.data?.forEach((dt) => {
      vis[dt.HerdUUID] = (props.prevVisibility && props.prevVisibility[dt.HerdUUID]) ?? dt.Visible === '1';
      noteField[dt.HerdUUID] = ((props.prevNotes && props.prevNotes[dt.HerdUUID]) || dt.Note) ?? '';

      if(props.prevActiveUntil && props.prevActiveUntil[dt.HerdUUID]) {
        activeUntilField[dt.HerdUUID] = props.prevActiveUntil[dt.HerdUUID]
      } else if (dt.ActiveUntil) {
        activeUntilField[dt.HerdUUID] = moment(dt.ActiveUntil).format('DD/MM/YYYY')
      } else {
        activeUntilField[dt.HerdUUID] = ''
      }
      if (dt.LicenseType) {
        existHerds[dt.HerdUUID] = {
          visible: dt.Visible === '1',
          note: dt.Note || '',
        };
      }
      if (dt.SeenIn) {
        seen[dt.HerdUUID] = dt.SeenIn
      }
    });
    setVisibility(vis);
    setNotes(noteField);
    setActiveUntilList(activeUntilField);
    setExist(existHerds);
    setSeenIn(seen)
  }, [fetcher.data, props.prevNotes, props.prevVisibility,props.prevActiveUntil]);

  useEffect(
    () => {
      var failDateValidation = false
      Object.entries(activeUntilList).forEach(([key, val]) => {
        if(val == ''){
          // (skip if empty string)
        } else if(!moment(val, 'DD/MM/YYYY',true).isValid()){
          failDateValidation = true
        } 
      })

      if(failDateValidation){
        setFailValidationDate(true)
      } else {
        setFailValidationDate(false)
      }
    },
    [activeUntilList]
  )
  useEffect(() => {
    let vis: { [key: string]: boolean } = {};
    fetcher.data?.forEach((dt) => {
      vis[dt.HerdUUID] = (props.prevVisibility && props.prevVisibility[dt.HerdUUID]) ?? dt.Visible === '1';
    })
    props.loadVisible ? props.loadVisible(vis) : ''
  }, [fetcher.data])
  return (
    <div className=''>
      <div className='flex justify-between items-center pb-3 bg-white z-20 gap-4 sticky top-0'>
        <Autocomplete
          value={search}
          className='py-2.5'
          onSelectChange={setSearch}
          options={fetcher.data ? fetcher.data?.map((d) => ({ label: d.HerdCode, value: d.HerdUUID })) : []}
          placeholder='Search Herd Code'
        />
        <div className='flex gap-3 items-center ml-3'>
          <Checkbox
            id='selectall'
            name='selectall'
            variant='primary'
            checked={allValuesTrue(visibility)}
            onChange={(e) => {
              const visible = e.currentTarget.checked;
              setVisibility((prev) => {
                let copy = Object.assign({}, prev);
                const ids = Object.keys(prev);
                for (let i = 0; i < ids.length; i++) {
                  const id = ids[i];
                  copy[id] = visible;
                }
                return copy;
              });
              setActiveUntilList((prevState) => {
                let copy = Object.assign({}, prevState);
                const ids = Object.keys(prevState);

                for (let i = 0; i < ids.length; i++) {
                  if(copy[ids[i]] == ''){
                    copy[ids[i]] = moment('31-12-2099', 'DD-MM-YYYY').format('DD/MM/YYYY');
                  } 
                }
                return copy;
              });
            }}
          />
          <label htmlFor='selectall' className='select-none font-medium'>
            Select All
          </label>
        </div>
        <Button
          type='button'
          disabled={failValidationDate}
          className='ml-auto'
          onClick={() => {
            if((Object.keys(visibility).filter(key => visibility[key] === true).length <= 0)) {
              setErrMsg('At least 1 visible herd is required, or close this modal and Easy Dairy ID will be unchecked')
            }
            props.onChange(filterUnchanged(exist, { ...visibility }, { ...notes }, { ...activeUntilList }, {...herdEasyDairySwitch}));
          }}
        >
          Confirm
        </Button>
      </div>
      {errMsg && <div><span className='text-error-500 text-sm text-right'>{errMsg}</span></div>}
      <div className="overflow-auto h-[calc(66vh-140px)]">
        <table className='border border-gray-300 border-t-0 w-full'>
          <thead>
            <tr className='bg-primary-500 [&>th]:p-3 text-white font-signika text-lg text-left z-10 sticky top-0'>
              <th>Herd Code</th>
              <th>License</th>
              <th>Valid Until</th>
              <th>Visible</th>
              <th>Start Date</th>
              <th>Days Visible</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {fetcher.data?.map((d, i) => (
              <tr
                key={i}
                className={`border-t border-gray-300 [&>td]:p-2 ${
                  search?.value && search.value !== d.HerdUUID ? 'hidden' : ''
                }`}
              >
                <td>{d.HerdCode}</td>
                <td>{d.LicenseType}</td>
                <td>
                  {
                    (visibility[d.HerdUUID] || d.ActiveUntil) &&
                    <input 
                      value={activeUntilList[d.HerdUUID] ? activeUntilList[d.HerdUUID] : d.ActiveUntil ? moment(d.ActiveUntil).format('DD/MM/YYYY') : ''}
                      className={`${moment(activeUntilList[d.HerdUUID], 'DD/MM/YYYY',true).isValid() ? 'border-gray-500' : 'border-red-500'} bg-white border rounded  px-3 py-[7px] w-36 text-dark min-h-[36px] focus:outline-none focus:ring-primary-500`}
                      onChange={ (changedVal) => {
                        setActiveUntilList((prevState) => {
                          let copy = { ...prevState };
                          copy[d.HerdUUID] = changedVal.target.value;
                          return copy;
                        });
                      }}
                    />
                  }
                </td>
                <td>
                  <SwitchToggle
                    enabled={visibility[d.HerdUUID] ?? d.Visible === '1'}
                    setEnabled={(checked) => {
                      if (checked && props.easyDairyId !== d.EasyDairyID) {
                        if (!confirm(`This herd was loading from ${d.EasyDairyID}. Do you wish to change it to load from ${props.easyDairyId}?`)) {
                          return
                        } else {
                          const checkIdx = d.SeenIn?.findIndex(s => s === props.easyDairyId)
                          if (d.SeenIn && checkIdx !== undefined && checkIdx > -1) {
                            let newSeenIn = [...d.SeenIn]
                            newSeenIn.splice(checkIdx, 1)
                            newSeenIn.push(d.EasyDairyID)
                            setHerdEasyDairySwitch(prev => ({
                              ...prev,
                              [d.HerdUUID]: {easyDairyId: props.easyDairyId, seenIn: newSeenIn}
                            }))
                          }
                        }
                      }
                      setVisibility((prevState) => {
                        let copy = { ...prevState };
                        if (d.HerdUUID in prevState) {
                          copy[d.HerdUUID] = !prevState[d.HerdUUID];
                        } else {
                          copy[d.HerdUUID] = d.Visible === '1' ? false : true;
                        }
                        return copy;
                      });
                      setActiveUntilList((prevState) => {
                        let copy = { ...prevState };

                        if(!d.ActiveUntil){
                          if(copy[d.HerdUUID]/*d.HerdUUID in prevState*/){
                            copy[d.HerdUUID] = '';
                            //delete copy[d.HerdUUID];
                          } else {
                            copy[d.HerdUUID] = moment('31-12-2099', 'DD-MM-YYYY').format('DD/MM/YYYY');
                          }
                        }
                        return copy;
                      });
                    }}
                  />
                </td>
                <td>
                  {d.VisibleAt
                    ? moment(d.VisibleAt).format('DD/MM/YYYY')
                    : visibility[d.HerdUUID]
                    ? moment().format('DD/MM/YYYY')
                    : ''}
                </td>
                <td>{d.VisibleAt ? moment().diff(moment(d.VisibleAt), 'days') : ''}</td>
                <td>
                  <textarea
                    onChange={(e) => {
                      setNotes((prev) => {
                        return { ...prev, [d.HerdUUID]: e.target.value };
                      });
                      if (!(d.HerdUUID in visibility)) {
                        setVisibility((prev) => ({ ...prev, [d.HerdUUID]: d.Visible === '1' }));
                      }
                    }}
                    className='border border-gray-300 rounded w-full resize-y p-2'
                    rows={1}
                    value={notes[d.HerdUUID] || ''}
                  />
                </td>
              </tr>
            ))}
            {fetcher.state !== 'idle' && (
              <tr>
                <td colSpan={7} className='p-4 text-center'>
                  <h3 className='text-xl'>Loading...</h3>
                </td>
              </tr>
            )}
            {fetcher.state === 'idle' && fetcher.data?.length === 0 && (
              <tr>
                <td colSpan={7} className='p-4 text-center'>
                  <h3 className='text-xl'>No herds found</h3>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BusinessHerdsComp;
