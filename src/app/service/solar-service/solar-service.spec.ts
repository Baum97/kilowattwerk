import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolarService } from './solar-service';

describe('SolarService', () => {
  let component: SolarService;
  let fixture: ComponentFixture<SolarService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolarService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolarService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
