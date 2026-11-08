import { createContext, useContext } from 'react'
import { Handle, Position } from '@xyflow/react'
import { BLOCKS, GROUPS, portTone, portsOf, titleOf } from '../../workflow/blocks'
import { Icon } from '../ui'

/** Extra per-render information for the nodes: which ran in the last test, and which have warnings. */
export const FlowInfo = createContext({ visited: new Map(), warned: new Map() })

export default function BlockNode({ id, data, selected }) {
  const def = BLOCKS[data.kind]
  const node = { id, data }
  const { visited, warned } = useContext(FlowInfo)
  const step = visited.get(id)
  const warn = warned.get(id)
  const ports = portsOf(node)
  const single = ports.length === 1 && !ports[0].label ? ports[0] : null
  return (
    <div className={`block ${selected ? 'sel' : ''} ${step ? 'ran' : ''}`}>
      {def.hasInput !== false && <Handle type="target" position={Position.Left} id="in" />}
      <div className="block-head" style={{ background: GROUPS[def.group].color }}>
        <Icon name={def.icon} size={16} />
        <span className="block-title">{titleOf(node)}</span>
        {step && <span className="block-step" title="Order it ran in the last test">{step.join(', ')}</span>}
        {warn && <span className={`block-warn ${warn}`} title="This block has a warning. Open the design check." />}
      </div>
      <div className="block-body">{def.summary(data.config)}</div>
      {single && <Handle type="source" position={Position.Right} id={single.id} className="single-out" />}
      {ports.length > 0 && !single && (
        <div className="block-ports">
          {ports.map((p) => (
            <div key={p.id} className="port-row">
              <span className="port-label"><i className={`dot ${portTone(p.id)}`} aria-hidden />{p.label}</span>
              <Handle type="source" position={Position.Right} id={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
