import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts';

type Props = {
  data: {[key: string]: string | number}[],
  layout: 'horizontal' | 'vertical',
  category: string,
  number: string,
  categoryOnClick?: (props: {value: string}) => void
}

type AxisType = "number" | "category"

const BarChartWidget = ({data, categoryOnClick, category, number, layout}: Props) => {
  const [categoryProps, setCatProps] = useState({
    tick: {fill: '#22378c'},
    type: "category" as AxisType,
    fontFamily: 'Signika Negative',
    fontSize: 18,
    textDecoration: categoryOnClick ? "underline" : undefined,
    onClick: categoryOnClick,
    fontWeight: 'bold',
    color: '#22378c',
    dataKey: category
  })
  const numberProps = {
    dataKey: number,
    type: "number" as AxisType
  }
  const [stateLayout, setLayout] = useState(layout)
  const categoryCount = useMemo(() => {
    let list = new Set()
    data.forEach((dt) => {
      list.add(dt[category])
    })
    return list.size
  }, [data, category])
  useEffect(() => {
    setCatProps((prevState) => ({
      ...prevState, 
      width: layout === "vertical" ? (window.innerWidth > 1240 ? 190 : Math.floor(window.innerWidth * 0.15)) : undefined
    }))
    setLayout(window.innerWidth < 724 ? 'vertical' : layout)
  }, [layout])
  return (<div className="w-full bg-white" style={categoryCount > 0 ? {height: categoryCount * 86} : {}}>
        {data?.length ? 
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                barCategoryGap={stateLayout === "vertical" ? 10 : 20}
                margin={{
                    top: 20,
                    right: stateLayout === "vertical" ? 30 : 10,
                    left: stateLayout === "vertical" ? 30 : 0,
                    bottom: 20,
                }}
                layout={stateLayout}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={stateLayout === "vertical"} />
                <XAxis {...(stateLayout === "vertical" ? numberProps : categoryProps)} />
                <YAxis {...(stateLayout === "horizontal" ? numberProps : categoryProps)} />
                {/*<Tooltip />*/}
                {/*<Legend />*/}
                <Bar dataKey="total" fill="#efe513">
                    <LabelList dataKey="total" position={stateLayout === "vertical" ? "right" : "top"} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
        : <div className="py-16 flex justify-center">
          <h3 className="text-lg">No data</h3>
        </div>
        }
    </div>
  );
};

export default BarChartWidget;