import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatteryCard } from './battery-card';

describe('BatteryCard', () => {
  let component: BatteryCard;
  let fixture: ComponentFixture<BatteryCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatteryCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BatteryCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
