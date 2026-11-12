import styled from 'styled-components';

/** Floating astronaut (user's AstronautLoader, scaled down). Decorative only. */
export default function Astronaut() {
  return (
    <Wrap aria-hidden="true">
      <div className="astronaut">
        <div className="head" />
        <div className="arm arm-l" />
        <div className="arm arm-r" />
        <div className="body">
          <div className="panel" />
        </div>
        <div className="leg leg-l" />
        <div className="leg leg-r" />
        <div className="bag" />
      </div>
    </Wrap>
  );
}

const Wrap = styled.div`
  position: relative;
  width: 130px;
  height: 150px;
  flex: none;

  .astronaut { width: 250px; height: 300px; position: absolute; top: 0; left: 0; transform-origin: 0 0; transform: scale(0.48); animation: astrofloat 6s ease-in-out infinite; }
  @keyframes astrofloat {
    0%, 100% { transform: scale(0.48) translateY(0) rotate(-6deg); }
    50% { transform: scale(0.48) translateY(-16px) rotate(6deg); }
  }
  .bag { width: 100px; height: 150px; position: absolute; z-index: 1; top: calc(50% - 75px); left: calc(50% - 50px); background: #94b7ca; border-radius: 50px 50px 0 0 / 30px 30px 0 0; }
  .head { width: 97px; height: 80px; position: absolute; z-index: 3; background: linear-gradient(to right, #e3e8eb 0%, #e3e8eb 50%, #fbfdfa 50%); border-radius: 50%; top: 34px; left: calc(50% - 47.5px); }
  .head::after { content: ''; width: 60px; height: 50px; position: absolute; top: calc(50% - 25px); left: calc(50% - 30px); background: linear-gradient(to bottom, #15aece 0%, #15aece 50%, #0391bf 50%); border-radius: 15px; }
  .head::before { content: ''; width: 12px; height: 25px; position: absolute; top: calc(50% - 12.5px); left: -4px; background: #618095; border-radius: 5px; box-shadow: 92px 0 0 #618095; }
  .body { width: 85px; height: 100px; position: absolute; z-index: 2; border-radius: 40px / 20px; top: 105px; left: calc(50% - 41px); background: linear-gradient(to right, #e3e8eb 0%, #e3e8eb 50%, #fbfdfa 50%); }
  .panel { width: 60px; height: 40px; position: absolute; top: 20px; left: calc(50% - 30px); background: #b7cceb; }
  .arm { width: 80px; height: 30px; position: absolute; top: 121px; z-index: 2; }
  .arm-l { left: 30px; background: #e3e8eb; border-radius: 0 0 0 39px; }
  .arm-r { right: 30px; background: #fbfdfa; border-radius: 0 0 39px 0; }
  .arm-l::before, .arm-r::before { content: ''; width: 30px; height: 70px; position: absolute; top: -40px; }
  .arm-l::before { border-radius: 50px 50px 0 120px / 50px 50px 0 110px; left: 0; background: #e3e8eb; }
  .arm-r::before { border-radius: 50px 50px 120px 0 / 50px 50px 110px 0; right: 0; background: #fbfdfa; }
  .leg { width: 30px; height: 40px; position: absolute; z-index: 2; bottom: 70px; }
  .leg-l { left: 76px; background: #e3e8eb; transform: rotate(20deg); }
  .leg-r { right: 73px; background: #fbfdfa; transform: rotate(-20deg); }
  .leg-l::before, .leg-r::before { content: ''; width: 50px; height: 25px; position: absolute; bottom: -26px; }
  .leg-l::before { left: -20px; background: #e3e8eb; border-radius: 30px 0 0 0; border-bottom: 10px solid #6d96ac; }
  .leg-r::before { right: -20px; background: #fbfdfa; border-radius: 0 30px 0 0; border-bottom: 10px solid #b0cfe4; }
`;
