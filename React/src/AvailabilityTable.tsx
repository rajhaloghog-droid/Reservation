interface AvailabilityTableProps {
  startTime: string
  endTime: string
  bookedSlots?: string[]
}

export default function AvailabilityTable({ startTime, endTime, bookedSlots = [] }: AvailabilityTableProps) {
  const generateTimeSlots = () => {
    if (!startTime || !endTime) return []

    const slots: string[] = []
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const endTotalMinutes = endHour * 60 + endMin
    let currentTotalMinutes = startHour * 60 + startMin

    while (currentTotalMinutes <= endTotalMinutes) {
      const hour = Math.floor(currentTotalMinutes / 60)
      const min = currentTotalMinutes % 60
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
      slots.push(timeStr)
      currentTotalMinutes += 30
    }

    return slots
  }

  const convertTo12Hour = (time24: string) => {
    const [hour, min] = time24.split(':')
    const hourNum = parseInt(hour)
    const period = hourNum >= 12 ? 'PM' : 'AM'
    const hour12 = hourNum % 12 || 12
    return `${String(hour12).padStart(2, '0')}:${min} ${period}`
  }

  const timeSlots = generateTimeSlots()

  if (timeSlots.length === 0) {
    return null
  }

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <h3>Available Time Slots (30-minute intervals)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #ddd',
          backgroundColor: '#fff'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #2c3e50',
                fontWeight: 'bold'
              }}>Time Slot</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #2c3e50',
                fontWeight: 'bold'
              }}>24-Hour Format</th>
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, index) => {
              const isBooked = bookedSlots.includes(slot)
              return (
                <tr
                  key={index}
                  style={{
                    backgroundColor: isBooked ? '#ffcccc' : (index % 2 === 0 ? '#f9f9f9' : '#fff'),
                    borderBottom: '1px solid #ddd',
                    color: isBooked ? '#cc0000' : '#000'
                  }}
                >
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                    {convertTo12Hour(slot)} {isBooked && <strong>(BOOKED)</strong>}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {slot}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        <strong>Total Slots:</strong> {timeSlots.length} available time slots
      </p>
    </div>
  )
}
