import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatteryMenu } from './battery-menu';

describe('BatteryMenu', () => {
  let component: BatteryMenu;
  let fixture: ComponentFixture<BatteryMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatteryMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BatteryMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
